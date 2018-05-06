import * as config from "config";
import * as async from "async";
import * as debug from "debug";
import * as randomstring from "randomstring";
import { CommandoClient } from "discord.js-commando";
import { Announcement } from "../../db/model/Announcement";
import { Op } from 'sequelize';
import { Guild } from "discord.js";
import { formatRichAnnouncement, formatAnnouncement } from "./utils";

export class AnnouncementDaemon {
    private static instance:AnnouncementDaemon;
    private static enabled:boolean = config.get('announcements.enabled');
    private static interval:number = config.get('announcements.interval');

    public static initialize(client:CommandoClient) {
        let instance = new AnnouncementDaemon(client);
        instance.start();

        AnnouncementDaemon.instance = instance;
    }

    private client:CommandoClient;
    private instanceID:string;
    private debugLog:debug.IDebugger;
    private errorLog:debug.IDebugger;
    private handler:NodeJS.Timer;

    private constructor(client:CommandoClient) {
        this.instanceID = randomstring.generate(8);
        this.debugLog = debug(`discomoka3:AnnouncementDaemon ${this.instanceID}:Debug`);
        this.errorLog = debug(`discomoka3:AnnouncementDaemon ${this.instanceID}:Error`);
        this.client = client;

        this.debugLog(`Setup Announcement Daemon`);
    }

    public start() {
        if (this.handler) return;
        this.debugLog('Starting daemon...');
        let self = this;
        this.handler = setInterval(() => { self.loop(); }, AnnouncementDaemon.interval * 1000);
        return self;
    }

    public stop() {
        if (!this.handler) return;
        this.debugLog('Stopping Daemon...');
        clearInterval(this.handler);
    }

    private async loop() {
        let self = this;
        this.debugLog('Daemon resumed...');

        try {
            let annos = await self.fetchPending();
            if (annos.length > 0) {
                this.debugLog(`Found ${annos.length} pending announcements to publish, updating server list...`);
                await self.client.syncGuilds();
                annos.forEach(async (a) => {
                    let posts = await self.postAnnouncement(a);
                    self.debugLog(`Posted announcement ${a.id} on ${posts} servers`);
                    a.postedBy = new Date();
                    try {
                        await a.save();
                        await a.destroy();
                    } catch (err) {
                        this.errorLog(`Error while deleting posted announcement (ID=${a.id})`);
                        console.error(err);
                    }
                });
            }
        } catch (err) {
            this.errorLog(`Error while fetching Announcement list`);
            console.error(err);
        }

        this.debugLog('Sending daemon to sleep...');
    }

    private async fetchPending():Promise<Announcement[]> {
        return Announcement.findAll({
            where: {
                postBy: { [Op.lte]: new Date() },
                postedBy: { [Op.eq]: null }
            }
        });
    }

    private async postAnnouncement(anno:Announcement):Promise<number> {
        let self = this;
        let richMessage = formatRichAnnouncement(anno, self.client),
            message = formatAnnouncement(anno);
        return new Promise<number>((resolve, reject) => {
            let servers = 0;
            async.eachLimit(self.client.guilds.array(), 5, async (guild:Guild, cb) => {
                try {
                    if (guild.defaultChannel) {
                        await guild.defaultChannel.send(richMessage);
                    }
                    await guild.owner.sendMessage(message);
                    servers += 1;
                    cb();
                } catch (err) {
                    self.errorLog(`Error while sending Announcement ${anno.id} to Server ${guild.id}`);
                    console.error(err);
                    cb(err);
                }
            }, (err) => {
                resolve(servers);
            });
        });
    }
}