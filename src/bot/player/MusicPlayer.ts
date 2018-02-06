import * as debug from "debug";
import { VoiceConnection, StreamDispatcher } from "discord.js";
import { VoiceConnectionManager } from "./VoiceConnectionManager";
import { Song } from './../../db/model/Song';
import { AddSongCommand } from "../commands/SongCommands";
import * as config from "config";
import * as path from "path";

const log = debug('discomoka3:MusicPlayer');

export class MusicPlayer {
    /* --- Static --- */
    private static playerMap:Map<string, MusicPlayer> = new Map<string, MusicPlayer>();
    private static BASE_MUSIC_PATH:string = config.get('music.storage');

    public static createPlayer(serverID:string):MusicPlayer {
        let player:MusicPlayer = new MusicPlayer(serverID);
        if (player.hasConnection()) {
            log(`Player for server ${serverID} has been created`);
            MusicPlayer.playerMap.set(serverID, player);
            return player;
        } else {
            log(`Due to a missing voice connection, the player for server ${serverID} has been dismissed`);
            return null;
        }
    }

    public static getPlayer(serverID:string):MusicPlayer {
        if (MusicPlayer.playerMap.has(serverID)) {
            return MusicPlayer.playerMap.get(serverID);
        } else {
            log(`No player available for server ${serverID}`);
            return null;
        }
    }

    public static deletePlayer(serverID:string):void {
        log(`Deleting player for server ${serverID} ...`);
        MusicPlayer.playerMap.delete(serverID);
    }

    private static setupDispatcher(instance:MusicPlayer, song:Song):void {
        let songPath = `${AddSongCommand.getFilePath(song.sourceType, song.source)}.mp3`;
        let dispatcher:StreamDispatcher = instance.connection.playFile(songPath);
        dispatcher.once('end', (reason:string) => {
            instance.log(`Stream ended for the following reason: ${reason}`);
            if (reason == 'skip') {
                instance.takeNext();
            } else if (reason == 'wish') {
                instance.currentSongID = instance.userRequestedID;
                instance.play();
            } else {
                instance.takeNext();
            }
        });
        dispatcher.on('error', (e) => {
            instance.log('An error occurred:', e);
        });
        instance.dispatcher = dispatcher;
    }

    private static generateRandomNumber(max:number, min:number = 0):number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    /* --- Instance --- */
    private serverID:string;
    private connection:VoiceConnection;
    private queue:number[] = [];
    private dispatcher:StreamDispatcher;
    private currentSongID:number;
    private userRequestedID:number;
    private shuffle:boolean = false;
    private log:debug.IDebugger;

    constructor(serverID:string) {
        this.log = debug(`discomoka3:MusicPlayer:${serverID}`);
        this.log(`Creating player for server ${serverID}`);
        this.serverID = serverID;
        this.connection = VoiceConnectionManager.getConnection(this.serverID);
    }

    public hasConnection():boolean {
        return !(!this.connection);
    }

    public isPlaying():boolean {
        return this.hasConnection() && this.queue.length > 0 && !(!this.dispatcher);
    }

    public get CurrentSongID():number {
        return this.currentSongID;
    }

    public async getCurrentSong():Promise<Song> {
        return Song.findOne({
            where: {
                serverID: this.serverID,
                id: this.currentSongID
            }
        })
    }

    public addSong(song:Song) {
        this.log(`Adding Song ${song.sourceType}/${song.source} ...`)
        this.addSongByID(song.id);
    }

    public addSongByID(songID:number) {
        if (this.queue.indexOf(songID) < 0) {
            this.queue.push(songID);
        }
    }

    public removeSong(song:Song) {
        this.removeSongByID(song.id);
    }

    public removeSongByID(songID:number) {
        let i = this.queue.indexOf(songID);
        if (i >= 0) {
            if (this.currentSongID == songID) {
                // Skip to next track when removing currently playing song
                this.takeNext();
            }
            this.queue.splice(i, 1);
        }
    }

    public hasSongInQueue(song:Song):boolean {
        return this.hasSongByIDInQueue(song.id);
    }

    public hasSongByIDInQueue(songID:number):boolean {
        return this.queue.indexOf(songID) >= 0;
    }

    public get Queue():number[] {
        return this.queue;
    }

    public get ShuffleEnabled():boolean { return this.shuffle; }
    public set ShuffleEnabled(shuffle:boolean) { this.shuffle = shuffle; }

    private takeNext() {
        let newIndex = this.ShuffleEnabled ?
            MusicPlayer.generateRandomNumber(this.queue.length - 1) : 
            (this.queue.indexOf(this.currentSongID) + 1) % this.queue.length;
        this.currentSongID = this.queue[newIndex];
        this.play();
    }

    private async play() {
        if (this.queue.length === 0) { return; }
        this.userRequestedID = null;

        let currentSong:Song = await Song.findById(this.currentSongID);
        if (!currentSong) {
            this.removeSongByID(this.currentSongID);
            this.takeNext();
            return;
        } else {
            MusicPlayer.setupDispatcher(this, currentSong);
        }
    }

    public startPlay() {
        this.takeNext();
    }

    public skip() {
        if (this.dispatcher) {
            this.dispatcher.end('skip');
        }
    }
}
