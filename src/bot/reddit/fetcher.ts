import * as randomstring from 'randomstring';
import * as debug from 'debug';
import * as config from 'config';
import * as async from 'async';
import { RedditAutoPostSettings } from '../../db/model/Reddit';
import { Op } from 'sequelize';
import { CommandoClient } from 'discord.js-commando';
import { Guild, TextChannel, RichEmbed } from 'discord.js';
import { fetchSubreddit, RedditPost } from './utils';

export class RedditFetcherStock {
    private static debugLog = debug(`discomoka3:RedditFetcherStock:Debug`);
    private static errorLog = debug(`discomoka3:RedditFetcherStock:Error`);
    private static servers:Map<string, RedditFetcher>;

    public static client:CommandoClient;

    public static async initialize(client:CommandoClient) {
        RedditFetcherStock.debugLog('Initializing RedditFetchStock...');

        let servers = new Map<string, RedditFetcher>();
        RedditFetcherStock.client = client;

        async.forEachLimit(client.guilds.map(g => g.id), 15, async (serverID:string, callback) => {
            try {
                const fetchers:number = await RedditAutoPostSettings.count({
                    where: { serverID: serverID }
                });
                if (fetchers > 0) {
                    servers.set(serverID, new RedditFetcher(serverID).start());
                }
                callback();
            } catch (err) {
                callback(err);
            }
        }, (err) => {
            if (err) {
                RedditFetcherStock.errorLog(`Error while initializing RedditFetcherStock!`);
                console.error(err);
            } else {
                RedditFetcherStock.debugLog(`Initialization completed`);
            }
            RedditFetcherStock.servers = servers;
        });
    }
}

export class RedditFetcher {
    private serverID:string;
    private debugLog:debug.IDebugger;
    private errorLog:debug.IDebugger;
    private interval:number;
    private minFetchInterval:number;
    private doNotSave:boolean; // mostly for debugging, do not use in production
    
    private handler:NodeJS.Timer;

    constructor(serverID:string) {
        this.debugLog = debug(`discomoka3:RedditFetcher ${serverID}:Debug`);
        this.errorLog = debug(`discomoka3:RedditFetcher ${serverID}:Error`);
        this.interval = config.get('reddit.poller.interval');
        this.minFetchInterval = config.get('reddit.serverLimits.minInterval');
        this.doNotSave = config.has('reddit.poller.donotsave') ? config.get('reddit.poller.donotsave') : false;
        this.serverID = serverID;

        this.debugLog(`Setup Fetcher for Server ${serverID}`);
    }

    public start() {
        let self = this;
        this.handler = setInterval(() => { self.loop(); }, this.interval * 1000);
        return self;
    }

    private async loop() {
        let self = this;
        this.debugLog('Fetcher started...');

        try {
            let subreddits = await this.fetchPending();
            this.debugLog(`Found ${subreddits.length} pending subreddit(s) to update`);

            for (let r of subreddits) {
                self.debugLog(`- ${r.subreddit} (Last updated: ${r.lastPostTimestamp}, ${r.lastPost})`);
                try {
                    let subredditListing = await fetchSubreddit(r.subreddit);
                    let filteredList = subredditListing.data.children.filter(i => i.data.stickied == false);
                    if (filteredList.length > 0) {
                        let firstItem = filteredList[0];
                        if (firstItem.data.name != r.lastPost) {
                            await self.sendRedditPost(firstItem.data, r);
                        } else {
                            await self.saveUpdatedTransaction(r);
                        }
                    } else {
                        await self.saveUpdatedTransaction(r);
                    }
                } catch (err) {
                    this.errorLog(`Error while fetching / processing Subreddit feed of /r/${r.subreddit}`);
                    console.error(err);
                }
            } 
        } catch (err) {
            this.errorLog(`Error while fetching Reddit feeds`);
            console.error(err);
        }

        this.debugLog(`Fetcher completed, restarting in ${this.interval} seconds`);
    }

    private async fetchPending():Promise<RedditAutoPostSettings[]> {
        return RedditAutoPostSettings.findAll({
            where: {
                serverID: this.serverID,
                lastPostTimestamp: {
                    [Op.or]: {
                        [Op.eq]: null,
                        [Op.lte]: new Date()
                    }
                }
            }
        });
    }

    private async sendRedditPost(redditPost:RedditPost, settings:RedditAutoPostSettings, doNotSave:boolean = false) {
        const client = RedditFetcherStock.client;

        // Validation
        const server = client.guilds.get(this.serverID);
        if (!server) {
            this.errorLog(`Could not post to server ${this.serverID} because the server could not be found.`);
            return;
        }

        const channel = server.channels.get(settings.targetChannel);
        if (!channel) {
            this.errorLog(`Could not post to channel ${this.serverID}/${settings.targetChannel} because the channel could not be found.`);
            return;
        }

        if (channel.type != 'text') {
            this.errorLog(`Could not post to channel ${this.serverID}/${settings.targetChannel} because it is not a text channel (got: ${channel.type}).`);
            return;
        }

        // Create Message
        let message = new RichEmbed()
            .setTitle(`New post on r/${redditPost.subreddit}`)
            .setURL(redditPost.url || `https://reddit.com${redditPost.permalink}`)
            .setDescription(redditPost.url);

        // Send Message
        await (<TextChannel>channel).send(message);

        // Save Transaction
        if (doNotSave) return;
        await this.saveUpdatedTransaction(settings, redditPost.name);
    }

    private async saveUpdatedTransaction(settings:RedditAutoPostSettings, postID:string = null) {
        settings.lastPost = postID || settings.lastPost;
        settings.lastPostTimestamp = new Date(new Date().getTime() + settings.interval * 60000);
        await settings.save();
    }
}