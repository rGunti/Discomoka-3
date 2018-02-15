import { BasePermissionCommand } from "../basecommands/BasePermissionCommand";
import { CommandoClient, CommandMessage } from "discord.js-commando";
import { Message, TextChannel, Guild, MessageEmbed, RichEmbed } from "discord.js";
import { Playlist } from "../../db/model/Playlist";
import { emoji } from "node-emoji";
import { getMessage, MessageLevel } from "../../utils/discord-utils";
import { codifyString } from './../../utils/discord-utils';
import { DetailSongCommand } from "./SongCommands";
import { Moment } from "moment";


export class CreatePlaylistCommand extends BasePermissionCommand {
    constructor(client:CommandoClient) {
        super(client, {
            name: 'createplaylist',
            aliases: [ '+p' ],
            group: 'music',
            memberName: 'createplaylist',
            description: 'Creates a new playlist on the server.',
            guildOnly: true,
            args: [
                {
                    key: 'name',
                    type: 'string',
                    label: 'Playlist Name',
                    prompt: 'Enter the name of the playlist you want to create:'
                }
            ],
            throttling: {
                usages: 1,
                duration: 15
            }
        }, [
            'Commands.Allowed',
            'MusicLib.Playlist.Create'
        ])
    }

    protected async runPermitted(msg:CommandMessage, args, fromPattern:boolean):Promise<Message|Message[]> {
        let self = this;
        let { name } = args;
        let channel:TextChannel = msg.message.channel as TextChannel;
        let serverID:string = msg.message.guild.id.toString();

        let playlist = Playlist.build({
            serverID: serverID,
            createdBy: msg.author.id,
            name: name
        });
        try {
            playlist = await playlist.save();
            return msg.reply(getMessage(
                MessageLevel.Success,
                `Playlist "${name}" created successfully. Playlist ID is ${codifyString(playlist.id.toString())}`
            ));
        } catch (err) {
            this.log(`Failed to save playlist on server ${serverID}:`, err);
            await msg.react(emoji.x);
            return msg.reply(getMessage(
                MessageLevel.Error,
                "Something went wrong when creating your playlist.",
                "Try again in a few minutes. If this happens again, notify your server admin or file a bug report."
            ));
        }
    }
}

export class PlaylistCommand extends BasePermissionCommand {
    constructor(client:CommandoClient) {
        super(client, {
            name: 'playlistinfo',
            aliases: [ 'p', 'playlist' ],
            group: 'music',
            memberName: 'playlistinfo',
            description: 'Shows all playlists on the server or information about a specific playlist.',
            guildOnly: true,
            args: [
                {
                    key: 'playlistID',
                    type: 'integer',
                    label: 'Playlist ID',
                    prompt: 'Enter the ID of a playlist you want to inspect.',
                    default: -1
                }
            ],
            throttling: {
                usages: 3,
                duration: 15
            }
        }, [
            'Commands.Allowed'
        ])
    }

    protected async runPermitted(msg:CommandMessage, args, fromPattern:boolean):Promise<Message|Message[]> {
        let self = this;
        let { playlistID } = args;
        let channel:TextChannel = msg.message.channel as TextChannel;
        let serverID:string = msg.message.guild.id.toString();

        let result;
        if (playlistID < 0) {
            // List
            result = await this.showList(msg.message.guild);
        } else {
            // Detail
            result = await this.showPlaylist(msg.message.guild, playlistID);
        }
        return channel.send(result);
    }

    private async showList(guild:Guild):Promise<string> {
        let playlists = await Playlist.findAll({
            where: { serverID: guild.id }
        });
        return `**Playlists on ${guild.name}** [_${playlists.length} playlist(s)_]\n` +
            playlists.map(p => `${codifyString(p.id)} ${p.name}`).join('\n');
    }

    private async showPlaylist(guild:Guild, playlistID:number):Promise<RichEmbed|string> {
        let playlist = await Playlist.findOne({
            where: { serverID: guild.id, id: playlistID }
        });
        if (playlist) {
            let creationDate:Moment = DetailSongCommand.getMomentFromDbDate(playlist.createdAt);
            return new RichEmbed()
                .setTitle(playlist.name)
                .setDescription(`Playlist ID: ${codifyString(playlist.id)}`)
                .addField(':incoming_envelope: Created by', `<@${playlist.createdBy}>`, true)
                .addField(
                    ':clock1: Created at', 
                    `${creationDate.format('YYYY-MM-DD HH:mm:ss Z')}\n_${creationDate.fromNow()}_`,
                    true
                )
                .setFooter(`To list this playlists content, use "momoka, pl ${playlist.id}"`);
        } else {
            return getMessage(
                MessageLevel.Error,
                "404 Playlist Not Found",
                `Sorry, but I couldn't find a playlist with the ID ${codifyString(playlistID)} on this server.`
            )
        }
    }
}
