import * as randomstring from 'randomstring';
import * as debug from 'debug';
import * as config from 'config';
import * as async from 'async';
import { RedditAutoPostSettings } from '../../db/model/Reddit';
import { Op } from 'sequelize';
import { CommandoClient } from 'discord.js-commando';
import { Guild } from 'discord.js';

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
    
    private handler:NodeJS.Timer;

    constructor(serverID:string) {
        this.debugLog = debug(`discomoka3:RedditFetcher ${serverID}:Debug`);
        this.errorLog = debug(`discomoka3:RedditFetcher ${serverID}:Error`);
        this.interval = config.get('reddit.poller.interval');
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
}