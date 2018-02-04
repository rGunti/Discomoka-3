import { Command, CommandoClient, CommandMessage } from "discord.js-commando";
import * as config from "config";
import { accessSync, stat, Stats } from "fs";
import { F_OK, ENOENT } from "constants";
import * as fx from "mkdir-recursive";
import * as debug from "debug";
import { join, dirname } from "path";
import { TextChannel, GroupDMChannel, DMChannel, Message, RichEmbed, VoiceChannel, VoiceConnection } from "discord.js";
import * as ytdl from "youtube-dl";
import { getMessage, MessageLevel, autoResolveMessage } from "../../utils/discord-utils";
import { sendMessage } from './../../utils/discord-utils';
import { Song } from "../../db/model/Song";
import { BasePermissionCommand } from "../basecommands/BasePermissionCommand";
import { Sequelize } from 'sequelize-typescript';
import * as moment from "moment";
import { VoiceConnectionManager } from "../player/VoiceConnectionManager";
import { MusicPlayer } from "../player/MusicPlayer";

export class AddSongCommand extends BasePermissionCommand {
    static allowedExtractors:string[];
    static storageDirectory:string;

    constructor(client:CommandoClient) {
        super(client, {
            name: 'addsong',
            aliases: [ 'as', '+s' ],
            group: 'music',
            memberName: 'addsong',
            description: 'Adds a song to the server\'s library',
            guildOnly: true,
            args: [
                {
                    key: 'url',
                    type: 'string',
                    label: 'Video / Music URL',
                    prompt: 'Enter the URL of the Video / Music item you want to add:'
                }
            ],
            throttling: {
                usages: 3,
                duration: 15
            }
        }, [
            'MusicLib.Track.Download'
        ]);

        if (!AddSongCommand.allowedExtractors) {
            AddSongCommand.allowedExtractors = 
                config.has('music.allowedExtractors') ?
                config.get('music.allowedExtractors') :
                []; 
        }
        if (!AddSongCommand.storageDirectory) {
            AddSongCommand.storageDirectory = config.get('music.storage');
        }

        if (!AddSongCommand.fileExists(AddSongCommand.storageDirectory)) {
            this.log(`Creating Music Directory for storage: ${AddSongCommand.storageDirectory}`);
            fx.mkdirSync(AddSongCommand.storageDirectory);
        }
    }

    private static fileExists(path:string):boolean {
        try {
            accessSync(path, F_OK);
            return true;
        } catch (err) {
            return false;
        }
    }

    public static getFilePath(extractor:string, itemID:string):string {
        return join(AddSongCommand.storageDirectory, extractor, itemID);
    }

    protected runPermitted(msg:CommandMessage, args, fromPattern:boolean):Promise<Message|Message[]> {
        let self = this;
        let { url } = args;
        let channel:TextChannel = msg.message.channel as TextChannel;
        let serverID:string = msg.message.guild.id.toString();

        return new Promise<Message>((
            resolve:(value?:Message|PromiseLike<Message>) => void,
            reject:(reason?:any) => void
        ) => {
            msg.channel.startTyping();
            ytdl.getInfo(url, [], null, (err:Error, info:any) => {
                if (err) {
                    return self.sendDefaultErrorResponse(channel, resolve);
                } else if (AddSongCommand.allowedExtractors.length > 0
                        && AddSongCommand.allowedExtractors.indexOf(info.extractor) < 0) {
                    return autoResolveMessage(
                        channel,
                        MessageLevel.Error,
                        'Provider not supported',
                        `Sorry, but we don't support the plattform your content came from.\n` +
                        `Your content came from the following platform: ${info.extractor}`,
                        resolve
                    );
                }

                let outputPath = AddSongCommand.getFilePath(info.extractor, info.id);
                let mp3Path = `${outputPath}.mp3`;

                let dirName = dirname(mp3Path);
                stat(dirName, async (err:NodeJS.ErrnoException, stats:Stats) => {
                    if (err && err.code === 'ENOENT') {
                        fx.mkdirSync(dirName);
                    } else if (err) {
                        return self.sendDefaultErrorResponse(channel, resolve);
                    }

                    let existingSong:Song = await Song.findOne<Song>({
                        where: {
                            sourceType: info.extractor,
                            source: info.id,
                            serverID: msg.message.guild.id.toString()
                        }
                    });
                    if (existingSong) {
                        return autoResolveMessage(
                            channel,
                            MessageLevel.Info,
                            'We already know this song',
                            `Someone already added ${existingSong.title} to the servers library. The ID is \`${existingSong.id}\`.`,
                            resolve
                        );
                    } else {
                        existingSong = await Song.findOne<Song>({
                            where: {
                                sourceType: info.extractor,
                                source: info.id
                            }
                        });
                    }

                    if (existingSong) {
                        let newSong:Song = await Song.build<Song>({
                            serverID: msg.message.guild.id.toString(),
                            uploadedBy: msg.message.author.id.toString(),
                            title: info.title,
                            artist: info.uploader,
                            sourceType: info.extractor,
                            source: info.id,
                            sourceLink: info.webpage_url 
                        }).save();
                        return autoResolveMessage(
                            channel,
                            MessageLevel.Success,
                            'Download completed',
                            `${info.title} added to the servers library, the ID is \`${newSong.id}\`.`,
                            resolve
                        );
                    } else {
                        autoResolveMessage(
                            channel,
                            MessageLevel.Processing,
                            'Processing...',
                            'I\'m adding your song to the servers library. Please hold on a second, you will get notified when I\'m done.',
                            (msg:Message) => {}
                        );
                        ytdl.exec(
                            url,
                            ['-x', '--audio-format', 'mp3', '-o', `${outputPath}.TMP`],
                            { cwd: dirname(AddSongCommand.storageDirectory) },
                            async(err:Error, output:any) => {
                                if (err) {
                                    // TODO: Implement a mechanism to notify the developer (via Discord) about the issue
                                    self.log(
                                        `Error when downloading track.` + 
                                        `\n Requested on server: ${msg.guild.id} ${msg.guild.name}` +
                                        `\n Requested by user:   ${msg.member.user.id} ${msg.member.user.tag}` +
                                        `\n Requested URL:       ${url}` +
                                        `\n Reported Error:\n${err.name}\n${err.message}\n${err.stack}`
                                    );
                                    autoResolveMessage(
                                        channel,
                                        MessageLevel.Error,
                                        'Download / Conversion Error',
                                        'Something went wrong while downloading / converting your entry.',
                                        resolve
                                    );
                                } else {
                                    let song:Song = await Song.build<Song>({
                                        serverID: msg.message.guild.id.toString(),
                                        uploadedBy: msg.message.author.id.toString(),
                                        title: info.title,
                                        artist: info.uploader,
                                        sourceType: info.extractor,
                                        source: info.id,
                                        sourceLink: info.webpage_url 
                                    }).save();
                                    autoResolveMessage(
                                        channel,
                                        MessageLevel.Success,
                                        'Download completed',
                                        `${info.title} added to the servers library, the ID is \`${song.id}\``,
                                        resolve
                                    );
                                }
                            }
                        );
                    }
                });
            });
        });
    }

    sendDefaultErrorResponse(channel:TextChannel, callback:(value?:Message|PromiseLike<Message>) => void) {
        autoResolveMessage(
            channel, 
            MessageLevel.Error,
            `HAAAALP!!! ${MessageLevel.Error}`,
            'Sorry, but a hamster tripped over the red wire and your request broke down.\n' +
            '**Suggested steps**:\n' +
            ' - Try again in a few minutes\n' +
            ' - Send a bug report to the developer\n' + 
            ' ~~- Rant on Twitter about how this bot sucks~~',
            callback
        );
    }
}

export class SearchSongCommand extends BasePermissionCommand {
    constructor(client:CommandoClient) {
        super(client, {
            name: 'searchsong',
            aliases: [ 'ss', 'search' ],
            group: 'music',
            memberName: 'searchsong',
            description: 'Searches for a song in the servers music library',
            guildOnly: true,
            args: [
                {
                    key: 'term',
                    type: 'string',
                    label: 'Search term',
                    prompt: 'Enter a term you want to search for in the servers library:'
                }
            ],
            throttling: {
                usages: 3,
                duration: 15
            }
        }, [
            'Commands.Allowed'
            // Maybe add a permission that allows members to browse the library
        ]);
    }

    protected runPermitted(msg:CommandMessage, args, fromPattern:boolean):Promise<Message|Message[]> {
        let self = this;
        let { term } = args;

        return new Promise<Message|Message[]>(async (resolve, reject) => {
            msg.channel.startTyping();
            let songs = await Song.findAll({
                where: {
                    [Sequelize.Op.or]: [
                        { title: { [Sequelize.Op.like]: `%${term}%` } },
                        { artist: { [Sequelize.Op.like]: `%${term}%` } }
                    ],
                    serverID: msg.guild.id
                },
                order: [
                    ['id', 'ASC']
                ],
                attributes: [ 'id', 'title', 'artist' ]
            });
            if (!songs || songs.length == 0) {
                autoResolveMessage(
                    msg.channel as TextChannel,
                    MessageLevel.Info,
                    "No results found",
                    `Could not find any hits for "${term}"`,
                    resolve
                );
            } else {
                let searchResultString = songs
                    .map(s => `\`${s.id}\` ${s.title} (by _${s.artist}_)`)
                    .join('\n');
                resolve(msg.channel.send(
                    `**Search result for "${term}"** [_${songs.length} song(s)_]\n${searchResultString}`, {
                    split: { char: '\n' }
                }));
            }
            msg.channel.stopTyping(true);
        });
    }
}

export class DetailSongCommand extends BasePermissionCommand {
    constructor(client:CommandoClient) {
        super(client, {
            name: 'detailsong',
            aliases: [ 'song', 's', 'cat' ],
            group: 'music',
            memberName: 'detailsong',
            description: 'Displays information about a given song (by ID)',
            guildOnly: true,
            args: [
                {
                    key: 'songID',
                    type: 'integer',
                    label: 'Song ID',
                    prompt: 'Enter the ID of a Song you want to display:'
                }
            ],
            throttling: {
                usages: 3,
                duration: 15
            }
        }, [
            'Commands.Allowed'
            // Maybe add a permission that allows members to browse the library
        ])
    }

    protected runPermitted(msg:CommandMessage, args, fromPattern:boolean):Promise<Message|Message[]> {
        let self = this;
        let { songID } = args;

        return new Promise<Message>(async (resolve, reject) => {
            msg.channel.startTyping();
            let song = await Song.findOne({
                where: {
                    id: songID,
                    serverID: msg.guild.id
                }
            });
            if (song) {
                msg.channel.send(self.constructMessageContentForSong(song));
            } else {
                autoResolveMessage(
                    msg.channel as TextChannel,
                    MessageLevel.Error,
                    '404 Song Not Found',
                    `Sorry, but I couldn't find a song with the ID ${songID} on this server.`,
                    resolve
                );
            }
            msg.channel.stopTyping(true);
        });
    }

    private constructMessageContentForSong(song:Song):RichEmbed {
        let creationDate:moment.Moment = DetailSongCommand.getMomentFromDbDate(song.createdAt);

        return new RichEmbed()
            .setTitle(song.title)
            .setDescription(`Song ID: \`${song.id}\``)
            .addField(':microphone: Artist / Uploader', song.artist)
            .addField(':incoming_envelope: Added by', `<@${song.uploadedBy}>`, true)
            .addField(
                ':clock1: Added at', 
                `${creationDate.format('YYYY-MM-DD HH:mm:ss Z')}\n_${creationDate.fromNow()}_`,
                true
            )
            .addField(':link: Original Source', song.sourceLink);
        // TODO: Add a short message about how to play this song as a footer
        //  e.g. "To play this song, enter "XYZ ${song.id}"
    }

    private static getMomentFromDbDate(date:Date):moment.Moment {
        return moment.utc({
            year: date.getFullYear(),
            month: date.getMonth(),
            day: date.getDate(),
            hour: date.getHours(),
            minute: date.getMinutes(),
            second: date.getSeconds()
        });
    }
}

export class AddSongToQueueCommand extends BasePermissionCommand {
    constructor(client:CommandoClient) {
        super(client, {
            name: 'queueadd',
            aliases: ['+q'],
            group: 'music',
            memberName: 'queueadd',
            description: 'Adds a given song to a queue.',
            guildOnly: true,
            args: [
                {
                    key: 'songID',
                    type: 'integer',
                    label: 'Song ID',
                    prompt: 'Enter the ID of a song to play:'
                }
            ],
            throttling: {
                usages: 2,
                duration: 15
            }
        }, [
            'Music.Play'
        ])
    }

    protected async runPermitted(msg:CommandMessage, args, fromPattern:boolean):Promise<Message|Message[]> {
        let self = this;
        let { songID } = args;
        let serverID:string = msg.guild.id;
        let textChannel:TextChannel = msg.message.channel as TextChannel;
        
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

        let songs = await Song.findAll({
            where: { id: songID, serverID: serverID }
        });
        if (songs.length === 1) {
            let song = songs[0];
            musicPlayer.addSong(song);
            return msg.reply(getMessage(
                MessageLevel.Success,
                "Added song to queue", `\`${song.id}\` ${song.title} (by _${song.artist}_)`
            ))
        } else {
            return msg.reply(getMessage(
                MessageLevel.Error,
                '404 Song Not Found',
                `Sorry, but I couldn't find a song with the ID ${songID} on this server.`
            ));
        }
    }
}

export class JoinChannelCommand extends BasePermissionCommand {
    constructor(client:CommandoClient) {
        super(client, {
            name: 'join',
            aliases: ['join2play', 'j'],
            group: 'music',
            memberName: 'join',
            description: 'Connects the bot to the voice channel the user is currently sitting in.',
            guildOnly: true,
            //args: [],
            throttling: {
                usages: 2,
                duration: 15
            }
        }, [
            'Music.Play'
        ]);
    }

    protected runPermitted(msg:CommandMessage, args, fromPattern:boolean):Promise<Message|Message[]> {
        let self = this;
        let voiceChannel:VoiceChannel = msg.message.member.voiceChannel;
        if (voiceChannel) {
            return new Promise<Message>((resolve, reject) => {
                voiceChannel.join()
                .then((connection:VoiceConnection) => {
                    msg.reply(getMessage(
                        MessageLevel.Success,
                        "Connected",
                        `Hi! I'm sitting in **${voiceChannel.name}** ready to play some sick tunes.`
                    )).then((message:Message) => {
                        resolve(message);
                    }).catch(self.log);
                    VoiceConnectionManager.addConnection(voiceChannel.guild.id, connection);
                })
                .catch((reason) => {
                    self.log(reason);
                    msg.reply(getMessage(
                        MessageLevel.Error,
                        "Could not join the voice channel",
                        ""
                    )).then((message:Message) => {
                        resolve(message);
                    }).catch(self.log);
                });
            });
        } else {
            return msg.reply(
                getMessage(
                    MessageLevel.Error,
                    "Cannot join",
                    "You are not sitting in a voice channel."
                )
            );
        }
    }
}

export class StartPlaybackCommand extends BasePermissionCommand {
    constructor(client:CommandoClient) {
        super(client, {
            name: 'play',
            //aliases: [ ],
            group: 'music',
            memberName: 'play',
            description: 'Starts playback',
            guildOnly: true,
            //args: [],
            throttling: {
                usages: 3,
                duration: 15
            }
        }, [
            'Music.Play',
            'Music.Skip'
        ]);
    }

    protected runPermitted(msg:CommandMessage, args, fromPattern:boolean):Promise<Message|Message[]> {
        let self = this;
        let serverID = msg.guild.id;

        let musicPlayer = MusicPlayer.getPlayer(serverID);
        if (!musicPlayer && !VoiceConnectionManager.getConnection(serverID)) {
            return msg.reply(getMessage(
                MessageLevel.Error,
                "Player is not connected", 
                "Please let me join your voice channel so I can play you some tunes."
            ))
        } else if (!musicPlayer) {
            return msg.reply(getMessage(
                MessageLevel.Info,
                "Empty queue", 
                "I don't have any tracks in my queue. Please add some songs to the queue to play."
            ))
        } else {
            musicPlayer.startPlay();
            return msg.reply(getMessage(MessageLevel.Success, "Playback started", ""));
        }
    }
}
