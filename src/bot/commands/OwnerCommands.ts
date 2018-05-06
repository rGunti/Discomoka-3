import { CommandoClient, Command, CommandMessage } from "discord.js-commando";
import { OwnerCommand } from "../basecommands/BaseOwnerCommand";
import { Message } from "discord.js";
import { getMessage, MessageLevel, codifyString } from "../../utils/discord-utils";
import { Announcement } from "../../db/model/Announcement";
import * as moment from "moment";

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

export class ListAnnouncementsCommand extends OwnerCommand {
    constructor(client:CommandoClient) {
        super(client, {
            name: 'announcelist',
            group: 'owner',
            memberName: 'announcelist',
            description: 'Lists all pending announcements.'
        });
    }

    public async run(msg:CommandMessage, args, fromPattern:boolean):Promise<Message|Message[]> {
        let self = this;
        try {
            let annos = await Announcement.findAll({
                order: ['postBy']
            });
            let messageList = annos
                .map(a => `- #${codifyString(a.id)}: ${a.title} (${codifyString(`Created: ${moment.utc(a.createdAt).format('YYYY-MM-DD HH:mm:ss z')}, Post By: ${moment.utc(a.postBy).format('YYYY-MM-DD HH:mm:ss z')}`)})`)
                .join('\n');
            msg.reply(getMessage(MessageLevel.None, `${annos.length} pending Announcement(s)`, messageList));
        } catch (err) {
            console.error(err);
            return msg.reply(getMessage(
                MessageLevel.Error,
                "An error occured while listing the announcements.",
                "Please try again later or check the logs."
            ));
        }
    }
}

export class DeleteAnnouncement extends OwnerCommand {
    constructor(client:CommandoClient) {
        super(client, {
            name: 'announcedelete',
            group: 'owner',
            memberName: 'announcedelete',
            description: 'Deletes a given announcement that has not already been posted.',
            args: [
                {
                    key: 'annoID',
                    type: 'integer',
                    label: 'Announcement ID',
                    prompt: 'Enter the ID of the announcement you want to delete:'
                }
            ]
        });
    }

    public async run(msg:CommandMessage, args, fromPattern:boolean):Promise<Message|Message[]> {
        let self = this;
        let { annoID } = args;

        try {
            let anno = await Announcement.findOne({ where: { id: annoID } });
            if (anno) {
                await anno.destroy();
                return msg.reply(getMessage(
                    MessageLevel.Success,
                    `Announcement "${anno.title}" deleted`
                ))
            } else {
                return msg.reply(getMessage(
                    MessageLevel.Warning,
                    `Announcement ${codifyString(annoID)} not found`
                ))
            }
        } catch (err) {
            console.error(err);
            return msg.reply(getMessage(
                MessageLevel.Error,
                "An error occured while deleting the announcement.",
                "Please try again later or check the logs."
            ));
        }
    }
}