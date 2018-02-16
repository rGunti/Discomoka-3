import { BasePermissionCommand } from "../basecommands/BasePermissionCommand";
import { CommandoClient, CommandMessage } from "discord.js-commando";
import { Message, TextChannel, Guild, MessageEmbed, RichEmbed } from "discord.js";
import { Playlist } from "../../db/model/Playlist";
import { emoji } from "node-emoji";
import { getMessage, MessageLevel } from "../../utils/discord-utils";
import { codifyString } from './../../utils/discord-utils';
import { DetailSongCommand } from "./SongCommands";
import { Moment } from "moment";
import { Song } from "../../db/model/Song";
import { MusicPlayer } from "../player/MusicPlayer";
import { VoiceConnectionManager } from "../player/VoiceConnectionManager";
import { PermissionCache } from "../../perm/permcache";
import { PlaylistSong } from "../../db/model/PlaylistSong";


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

export class ListPlaylistCommand extends BasePermissionCommand {
    constructor(client:CommandoClient) {
        super(client, {
            name: 'listplaylist',
            aliases: [ 'pl' ],
            group: 'music',
            memberName: 'listplaylist',
            description: 'List a playlists content',
            guildOnly: true,
            args: [
                {
                    key: 'playlistID',
                    type: 'integer',
                    label: 'Playlist ID',
                    prompt: 'Enter the ID of a playlist whose content you want to display'
                }
            ],
            throttling: {
                usages: 1,
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

        return channel.send(await this.showList(msg.message.guild, playlistID));
    }

    private async showList(guild:Guild, playlistID:number):Promise<string> {
        let playlist = await Playlist.findOne({
            where: { serverID: guild.id, id: playlistID }
        });
        if (playlist) {
            let songs = await playlist.getSongs();
            return `**Content of Playlist "${playlist.name}"** [_${songs.length} song(s)_]\n` +
                songs.map(s => `${codifyString(s.id)} - ${s.title} (by _${s.artist}_)`).join('\n');
        } else {
            return getMessage(
                MessageLevel.Error,
                "404 Playlist Not Found",
                `Sorry, but I couldn't find a playlist with the ID ${codifyString(playlistID)} on this server.`
            )
        }
    }
}

export class AddSongToPlaylistCommand extends BasePermissionCommand {
    constructor(client:CommandoClient) {
        super(client, {
            name: 'addsongtoplaylist',
            aliases: [ '+ps' ],
            group: 'music',
            memberName: 'addsongtoplaylist',
            description: 'Adds a song to a playlist.',
            guildOnly: true,
            args: [
                {
                    key: 'playlistID',
                    type: 'integer',
                    label: 'Playlist ID',
                    prompt: 'Enter the ID of a playlist you want to add a song to:'
                },
                {
                    key: 'songID',
                    type: 'integer',
                    label: 'Song ID',
                    prompt: 'Enter the ID of a song you want to add:'
                }
            ]
        }, [
            'Commands.Allowed',
            'MusicLib.Playlist.Create'
        ])
    }

    protected async runPermitted(msg:CommandMessage, args, fromPattern:boolean):Promise<Message|Message[]> {
        let self = this;
        let { playlistID, songID } = args;
        let channel:TextChannel = msg.message.channel as TextChannel;
        let serverID:string = msg.message.guild.id.toString();

        let playlist = await Playlist.findOne({
            where: { serverID: serverID, id: playlistID }
        });
        if (!playlist) {
            return msg.reply(getMessage(
                MessageLevel.Error,
                "404 Playlist Not Found",
                `Sorry, but I couldn't find a playlist with the ID ${codifyString(playlistID)} on this server.`
            ));
        }

        let song = await Song.findOne({
            where: { serverID: serverID, id: songID }
        });
        if (!song) {
            return msg.reply(getMessage(
                MessageLevel.Error,
                "404 Song Not Found",
                `Sorry, but I couldn't find a song with the ID ${codifyString(songID)} on this server.`
            ));
        }

        try {
            await playlist.addSong(song);
            return msg.reply(getMessage(
                MessageLevel.Success,
                "Song added to playlist",
                `"${song.title}" has been added to "${playlist.name}".`
            ))
        } catch (err) {
            this.log(`Failed to add song to playlist on server ${serverID}:`, err);
            await msg.react(emoji.x);
            return msg.reply(getMessage(
                MessageLevel.Error,
                "Something went wrong when adding the song to your playlist.",
                "Try again in a few minutes. If this happens again, notify your server admin or file a bug report."
            ));
        }
    }
}

export class RemoveSongToPlaylistCommand extends BasePermissionCommand {
    constructor(client:CommandoClient) {
        super(client, {
            name: 'removesongfromplaylist',
            aliases: [ '-ps' ],
            group: 'music',
            memberName: 'removesongfromplaylist',
            description: 'Removes a song from a playlist.',
            guildOnly: true,
            args: [
                {
                    key: 'playlistID',
                    type: 'integer',
                    label: 'Playlist ID',
                    prompt: 'Enter the ID of a playlist you want to remove a song from:'
                },
                {
                    key: 'songID',
                    type: 'integer',
                    label: 'Song ID',
                    prompt: 'Enter the ID of a song you want to remove:'
                }
            ]
        }, [
            'Commands.Allowed',
            'MusicLib.Playlist.Create'
        ])
    }

    protected async runPermitted(msg:CommandMessage, args, fromPattern:boolean):Promise<Message|Message[]> {
        let self = this;
        let { playlistID, songID } = args;
        let channel:TextChannel = msg.message.channel as TextChannel;
        let serverID:string = msg.message.guild.id.toString();

        let playlist = await Playlist.findOne({
            where: { serverID: serverID, id: playlistID }
        });
        if (!playlist) {
            return msg.reply(getMessage(
                MessageLevel.Error,
                "404 Playlist Not Found",
                `Sorry, but I couldn't find a playlist with the ID ${codifyString(playlistID)} on this server.`
            ));
        }

        let song = await Song.findOne({
            where: { serverID: serverID, id: songID }
        });
        if (!song) {
            return msg.reply(getMessage(
                MessageLevel.Error,
                "404 Song Not Found",
                `Sorry, but I couldn't find a song with the ID ${codifyString(songID)} on this server.`
            ));
        }

        try {
            await playlist.removeSong(song);
            return msg.reply(getMessage(
                MessageLevel.Success,
                "Song removed from playlist",
                `"${song.title}" has been removed from "${playlist.name}".`
            ))
        } catch (err) {
            this.log(`Failed to remove song from playlist on server ${serverID}:`, err);
            await msg.react(emoji.x);
            return msg.reply(getMessage(
                MessageLevel.Error,
                "Something went wrong when removing the song from your playlist.",
                "Try again in a few minutes. If this happens again, notify your server admin or file a bug report."
            ));
        }
    }
}

export class LoadPlaylistCommand extends BasePermissionCommand {
    constructor(client:CommandoClient) {
        super(client, {
            name: 'loadplaylist',
            aliases: [ '+pq' ],
            group: 'music',
            memberName: 'loadplaylist',
            description: 'Loads a playlist into the queue.',
            guildOnly: true,
            args: [
                {
                    key: 'playlistID',
                    type: 'integer',
                    label: 'Playlist ID',
                    prompt: 'Enter the ID of a playlist you want to load:'
                }
            ],
            throttling: {
                usages: 1,
                duration: 10
            }
        }, [
            'Commands.Allowed',
            'Music.Play',
            'Music.Skip'
        ])
    }

    protected async runPermitted(msg:CommandMessage, args, fromPattern:boolean):Promise<Message|Message[]> {
        let self = this;
        let { playlistID } = args;
        let channel:TextChannel = msg.message.channel as TextChannel;
        let serverID:string = msg.message.guild.id.toString();

        let playlist = await Playlist.findOne({
            where: { serverID: serverID, id: playlistID }
        });
        if (!playlist) {
            return msg.reply(getMessage(
                MessageLevel.Error,
                "404 Playlist Not Found",
                `Sorry, but I couldn't find a playlist with the ID ${codifyString(playlistID)} on this server.`
            ));
        }

        let musicPlayer = MusicPlayer.getPlayer(serverID);
        if (!musicPlayer) {
            musicPlayer = MusicPlayer.createPlayer(serverID);
        }
        if (!musicPlayer) {
            return msg.reply(getMessage(
                MessageLevel.Error,
                "Failed to create player",
                "Initialization failed while starting playback."
            ));
        }
        musicPlayer.clear();

        let songs = await playlist.getSongs();
        musicPlayer.addSongs(songs);
        return msg.reply(getMessage(
            MessageLevel.Success,
            `Playlist "${playlist.name}" has been loaded`,
            `${songs.length} song(s) added to queue`
        ));
    }
}

export class DeletePlaylistCommand extends BasePermissionCommand {
    constructor(client:CommandoClient) {
        super(client, {
            name: 'deleteplaylist',
            aliases: [ '-p' ],
            autoAliases: false,
            group: 'music',
            memberName: 'deleteplaylist',
            description: 'Deletes a playlist from the server.',
            guildOnly: true,
            args: [
                {
                    key: 'playlistID',
                    type: 'integer',
                    label: 'Playlist ID',
                    prompt: 'Enter the ID of a playlist you want to delete:'
                }
            ],
            throttling: {
                usages: 1,
                duration: 10
            }
        }, [
            'Commands.Allowed',
            'MusicLib.Playlist.Create'
        ])
    }

    protected async runPermitted(msg:CommandMessage, args, fromPattern:boolean):Promise<Message|Message[]> {
        let self = this;
        let { playlistID } = args;
        let channel:TextChannel = msg.message.channel as TextChannel;
        let serverID:string = msg.message.guild.id.toString();
        let authorID:string = msg.author.id.toString();

        let playlist = await Playlist.findOne({
            where: { serverID: serverID, id: playlistID }
        });
        if (!playlist) {
            return msg.reply(getMessage(
                MessageLevel.Error,
                "404 Playlist Not Found",
                `Sorry, but I couldn't find a playlist with the ID ${codifyString(playlistID)} on this server.`
            ));
        }

        if (playlist.createdBy == authorID) {
            return this.deletePlaylist(msg, playlist);
        } else if (PermissionCache.Instance.hasMemberPermission(msg.member, 'MusicLib.Playlist.Delete')) {
            return this.deletePlaylist(msg, playlist);
        } else {
            return msg.reply(getMessage(
                MessageLevel.PermissionError,
                "You can't delete this playlist!",
                "You have to be the author of the playlist to delete it or have the required permission to do so."
            ));
        }
    }

    private async deletePlaylist(msg:CommandMessage, playlist:Playlist):Promise<Message|Message[]> {
        try {
            let links = await PlaylistSong.findAll({ where: { playlistID: playlist.id } });
            links.forEach(async (l) => await l.destroy());
            await playlist.destroy();
            return msg.reply(getMessage(
                MessageLevel.Success,
                `Playlist "${playlist.name}" deleted`
            ));
        } catch (err) {
            this.log(`Failed to delete playlist on server ${msg.message.guild.id}:`, err);
            await msg.react(emoji.x);
            return msg.reply(getMessage(
                MessageLevel.Error,
                "Something went wrong when deleting the playlist.",
                "Try again in a few minutes. If this happens again, notify your server admin or file a bug report."
            ));
        }
    }
}
