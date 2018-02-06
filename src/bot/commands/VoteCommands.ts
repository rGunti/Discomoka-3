import { BasePermissionCommand } from "../basecommands/BasePermissionCommand";
import { CommandoClient, CommandMessage } from 'discord.js-commando';
import { Message, MessageReaction, Collection, RichEmbed, GuildMember, TextChannel } from "discord.js";
import { getMessage, MessageLevel } from "../../utils/discord-utils";
import * as emoji from "node-emoji";
import * as moment from "moment";
import * as debug from "debug";
import * as async from "async";
import { Pool } from "../voting/Pool";

export class StartVoteCommand extends BasePermissionCommand {
    static VOTE_YES = emoji.get('thumbsup');
    static VOTE_NO = emoji.get('thumbsdown');
    static MAX_POOL_TIME = 5 * 24 * 60 * 60; // 5 days

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
                },
                {
                    key: 'duration',
                    type: 'time',
                    label: 'Duration of your pool',
                    prompt: 'Please enter how long your pool will stay open for votes:'
                }
            ],
            throttling: {
                usages: 1,
                duration: 30
            }
        }, [
            'Commands.Allowed',
            'Vote.Start'
        ]);
    }

    protected runPermitted(msg:CommandMessage, args, fromPattern:boolean):Promise<Message|Message[]> {
        let self = this;
        let { topic, duration } = args;

        let pool:Pool = new Pool(msg.member, topic, duration);
        pool.startPool(msg.channel as TextChannel);

        return null;
    }
}
