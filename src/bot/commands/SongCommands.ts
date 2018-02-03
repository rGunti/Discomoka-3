import { Command, CommandoClient, CommandMessage } from "discord.js-commando";
import * as config from "config";
import { accessSync, stat, Stats } from "fs";
import { F_OK, ENOENT } from "constants";
import * as fx from "mkdir-recursive";
import * as debug from "debug";
import { join, dirname } from "path";
import { TextChannel, GroupDMChannel, DMChannel, Message } from "discord.js";
import * as ytdl from "youtube-dl";
import { getMessage, MessageLevel, autoResolveMessage } from "../../utils/discord-utils";
import { sendMessage } from './../../utils/discord-utils';
import { Song } from "../../db/model/Song";
import { BasePermissionCommand } from "../basecommands/BasePermissionCommand";
import { Sequelize } from 'sequelize-typescript';

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

    private static getFilePath(extractor:string, itemID:string):string {
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
