import { BasePermissionCommand } from "../basecommands/BasePermissionCommand";
import { CommandoClient, CommandMessage } from "discord.js-commando";
import { Message, TextChannel } from "discord.js";
import { getMessage, MessageLevel, codifyString } from "../../utils/discord-utils";
import * as config from 'config';
import { RedditAutoPostSettings } from './../../db/model/Reddit';
import { subredditExists } from "../reddit/utils";

export class RedditPostPullerSetup extends BasePermissionCommand {
    static limitSettings = {
        minInterval: <number>config.get('reddit.serverLimits.minInterval'),
        maxItems: <number>config.get('reddit.serverLimits.maxItems')
    };

    static internalError = getMessage(
        MessageLevel.Error, "Internal Error", "Whoops! Something went wrong here... Please try again later, okay? ô_ô"
    )

    constructor(client:CommandoClient) {
        super(client, {
            name: 'redditsetup',
            group: 'reddit',
            memberName: 'redditsetup',
            description: 'Sets up a new reddit post puller for your server.',
            args: [
                {
                    key: 'subreddit',
                    type: 'string',
                    label: 'Subreddit',
                    prompt: 'Enter the name of the subreddit you want to get posts from:'
                },
                {
                    key: 'targetChannel',
                    type: 'channel',
                    label: 'Target Channel',
                    prompt: 'Enter the channel where new posts should be sent to:'
                },
                {
                    key: 'interval',
                    type: 'time',
                    label: 'Fetch interval',
                    prompt: 'Please enter how often Discomoka should look for new posts:',
                    default: 1 * 60 * 60  // default: 1h
                }
            ]
        }, [
            'Commands.Allowed',
            //'Reddit.Setup'
        ]);
    }

    protected async runPermitted(msg:CommandMessage, args, fromPattern:boolean):Promise<Message|Message[]> {
        let self = this;
        let { subreddit, targetChannel, interval } = args;

        // Check if input is valid
        if (interval < RedditPostPullerSetup.limitSettings.minInterval) {
            return msg.reply(getMessage(
                MessageLevel.Error,
                "Interval too short",
                `Your entered interval of ${interval} seconds is too short. Minimum is ${RedditPostPullerSetup.limitSettings.minInterval} seconds.`
            ));
        }

        // Check if server has any open slots or if the specified subreddit has already been setup
        try {
            const usedSlots = await RedditAutoPostSettings.count({
                where: { serverID: msg.guild.id }
            });
            if (usedSlots >= RedditPostPullerSetup.limitSettings.maxItems) {
                return msg.reply(getMessage(
                    MessageLevel.Error,
                    "No slots left",
                    `Sorry, but you can't add another post puller to your server because you have used ${usedSlots} of the available ${RedditPostPullerSetup.limitSettings.maxItems} slots.\n` + 
                    `Consider deleting a post puller.`
                ));
            } else if (usedSlots > 0) {
                // Subreddit has already been setup, just adjust target and interval
                const existingPuller = await RedditAutoPostSettings.findAll({
                    where: {
                        subreddit: subreddit,
                        serverID: msg.guild.id
                    }
                });
                if (existingPuller.length > 0) {
                    let puller = existingPuller[0];
                    puller.targetChannel = targetChannel.id;
                    puller.interval = interval;

                    await puller.save();
                    return msg.reply(getMessage(
                        MessageLevel.Success,
                        `Adjusted post puller for r/${subreddit}`
                    ));
                }
            }
        } catch (err) {
            console.error(err);
            return msg.reply(RedditPostPullerSetup.internalError);
        }

        // Check if subreddit exists
        try {
            if (!(await subredditExists(subreddit))) {
                return msg.reply(RedditPostPullerSetup.getMissingSubredditMessage(subreddit));
            }
        } catch (err) {
            console.error(err);
            return msg.reply(RedditPostPullerSetup.getMissingSubredditMessage(subreddit));
        }

        // Add puller
        try {
            let pullerSettings = new RedditAutoPostSettings({
                serverID: msg.guild.id,
                subreddit: subreddit,
                targetChannel: targetChannel.id,
                interval: interval
            });
            await pullerSettings.save();
            await (<TextChannel>targetChannel).send(`Here, I am posting the lastest r/${subreddit} posts for you. Have fun!`);
            return msg.reply(getMessage(
                MessageLevel.Success,
                `Post Puller for ${codifyString('r/' + subreddit)} has been setup on <#${targetChannel.id}>`
            ));
        } catch (err) {
            console.error(err);
            return msg.reply(RedditPostPullerSetup.internalError);
        }
    }

    protected static getMissingSubredditMessage(subreddit:string):string {
        return getMessage(
            MessageLevel.Error,
            'Subreddit does not exist',
            `Sorry, but I couldn't find ${codifyString(`r/${subreddit}`)}. Does it even exist or is it just empty?`
        );
    }
}