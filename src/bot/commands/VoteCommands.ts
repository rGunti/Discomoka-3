import { BasePermissionCommand } from "../basecommands/BasePermissionCommand";
import { CommandoClient, CommandMessage } from 'discord.js-commando';
import { Message } from "discord.js";
import { getMessage, MessageLevel } from "../../utils/discord-utils";
import * as emoji from "node-emoji";

export class StartVoteCommand extends BasePermissionCommand {
    constructor(client:CommandoClient) {
        super(client, {
            name: 'startvote',
            group: 'voting',
            memberName: 'startvote',
            description: 'Starts a voting pool about a given topic.',
            guildOnly: true,
            args: [
                {
                    key: 'topic',
                    type: 'string',
                    label: 'Topic of your pool',
                    prompt: 'Enter the topic of your pool:'
                }
                // TODO: Add argument for duration
                // TODO: Create data type for time (Input: "10m", "2h", "4d")
                // TODO: Display start and end time using UTC time (moment.utc().format(...))
                //       Calculate using moment().add(12, 'minutes') or
                //       moment().add({hours: 2, minutes: 51})
                //       Range should be 1 min - 5 days
                //       When the pool is closed, 
                //        - the end result will be displayed and pinned
                //        - Pool will be unpinned (and deleted?)
            ],
            throttling: {
                usages: 1,
                duration: 30
            }
        }, [
            'Commands.Allowed'
            // TODO: Add fitting permissions
        ]);
    }

    protected runPermitted(msg:CommandMessage, args, fromPattern:boolean):Promise<Message|Message[]> {
        let self = this;
        let { topic } = args;

        return new Promise<Message|Message[]>((resolve, reject) => {
            msg.channel.send(
                '@everyone **VOTE**:\n```\n' + topic + '\n```\nVote by using the reactions at the bottom of this message.'
            ).then(async (poolMessage:Message) => {
                // Pin pool so everyone can find it
                poolMessage.pin();

                // Add emojis to vote with
                await poolMessage.react(emoji.get('thumbsup'));
                await poolMessage.react(emoji.get('thumbsdown'));

                // Resolve Promise
                resolve(poolMessage);
            });
        });
    }
}