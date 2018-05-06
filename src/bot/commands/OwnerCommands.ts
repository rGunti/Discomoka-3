import { CommandoClient, Command, CommandMessage } from "discord.js-commando";
import { OwnerCommand } from "../basecommands/BaseOwnerCommand";
import { Message } from "discord.js";

export class AnnouncementCommand extends OwnerCommand {
    constructor(client:CommandoClient) {
        super(client, {
            name: 'announce',
            group: 'owner',
            memberName: 'announce',
            description: 'Sends an announcement to every server.',
            args: [
                {
                    key: 'title',
                    type: 'string',
                    label: 'Title of Announcement',
                    prompt: 'Enter the title of your announcement:'
                },
                {
                    key: 'message',
                    type: 'string', 
                    label: 'Message of Announcement',
                    prompt: 'Enter the message of your announcement:'
                },
                {
                    key: 'postBy',
                    type: 'datetime',
                    label: 'Post time',
                    prompt: 'Enter a date and time when the announcement should be posted:'
                }
            ]
        });
    }

    public run(msg:CommandMessage, args, fromPattern:boolean):Promise<Message|Message[]> {
        let self = this;
        let {
            title,
            message,
            postBy
        } = args;

        return null;
    }
}