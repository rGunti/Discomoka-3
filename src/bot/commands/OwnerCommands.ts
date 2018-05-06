import { CommandoClient, Command, CommandMessage } from "discord.js-commando";
import { OwnerCommand } from "../basecommands/BaseOwnerCommand";
import { Message } from "discord.js";
import { getMessage, MessageLevel } from "../../utils/discord-utils";
import { Announcement } from "../../db/model/Announcement";

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

    public async run(msg:CommandMessage, args, fromPattern:boolean):Promise<Message|Message[]> {
        let self = this;
        let {
            title,
            message,
            postBy
        } = args;

        if (!postBy) {
            return msg.reply(getMessage(
                MessageLevel.Error,
                `Post By date invalid`,
                `The entered "post by" date is invalid.`
            ));
        }

        let anno = new Announcement({
            title: title,
            message: message,
            postBy: postBy
        });
        try {
            await anno.save();
            return msg.reply(getMessage(
                MessageLevel.Success,
                `The announcement "${anno.title}" has been saved`
            ));
        } catch (err) {
            console.error(err);
            return msg.reply(getMessage(
                MessageLevel.Error,
                "An error occured while saving the announcement.",
                "Please try again later or check the logs."
            ));
        }
    }
}