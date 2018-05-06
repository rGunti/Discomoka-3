import { Announcement } from "../../db/model/Announcement";
import { RichEmbed, Client } from "discord.js";
import { getMessage, MessageLevel } from "../../utils/discord-utils";
import * as moment from "moment";

export function formatRichAnnouncement(anno:Announcement, client:Client):RichEmbed {
    return new RichEmbed()
        .setAuthor(client.user.username, client.user.avatarURL)
        .setTitle(`:loudspeaker: ANNOUNCEMENT: ${anno.title}`)
        .setDescription(anno.message)
        .setFooter(`This announcement was sent to you on ${moment.utc().format('YYYY-MM-DD HH:mm:ss z')}`);
}

export function formatAnnouncement(anno:Announcement):string {
    return getMessage(
        MessageLevel.Info,
        `:loudspeaker: ANNOUNCEMENT: ${anno.title}`,
        '\n' + anno.message + '\n\n' +
        '_You receive this message because one (or more) of your Discord servers are using the **Discomoka 3** bot. ' +
        'This message is meant as a notification for server owners and administrators to inform about ' +
        'important changes, upcoming new features and more. ' +
        'If you are not using this bot actively, consider removing it from your server._\n' +
        '_Thank you for using **Discomoka 3** :)_'
    );
}
