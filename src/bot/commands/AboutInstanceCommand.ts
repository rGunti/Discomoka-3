import * as moment from 'moment';
import 'moment-duration-format';
import { Command, CommandoClient, CommandMessage } from 'discord.js-commando';
import { TextChannel, RichEmbed, Client, Message } from 'discord.js';
import { Duration, Format, Moment } from 'moment';
import * as pjson from 'pjson';
import * as filesize from 'filesize';

export class AboutInstanceCommand extends Command {
    static preparedData:PreparedData;

    constructor(client:CommandoClient) {
        super(client, {
            name: 'aboutme',
            group: 'debug',
            memberName: 'aboutme',
            description: 'Tells you about myself and my wellbeing',
            aliases: ['me', 'i', 'wtfwhoru', 'hi', 'e'],
            throttling: {
                usages: 1,
                duration: 60
            }
        });

        if (!AboutInstanceCommand.preparedData) {
            AboutInstanceCommand.preparedData = new PreparedData();
        }
    }

    public run(msg:CommandMessage, args:string|object|string[], fromPattern:boolean):Promise<Message|Message[]> {
        let data:PreparedData = AboutInstanceCommand.preparedData;
        let textChannel = msg.message.channel;

        let uptime:Duration = moment.duration(process.uptime(), "seconds");
        let uptimeStr:string = uptime.format('d [d] hh:mm:ss');
        let startup:Moment = moment().subtract(uptime);
        let startupStr:string = startup.format('YYYY-MM-DD HH:mm:ss');

        let memoryUsage:NodeJS.MemoryUsage = process.memoryUsage();

        let response:RichEmbed = new RichEmbed()
            .setAuthor(this.client.user.username, this.client.user.avatarURL)
            .setTitle(`About Discomoka 3 (${data.AppName})`)
            .setDescription(data.AppDescription)
            .addField('Version', data.AppVersion, true)
            .addField('Platform', `Node.JS ${process.version}`, true)
            .addField('Uptime', `${uptimeStr}\n${startupStr}`, true)
            .addField('Server Time', moment().format('YYYY-MM-DD HH:mm:ss'))
            .addField('Memory Usage', 
                `Heap: ${filesize(memoryUsage.heapUsed)} / ${filesize(memoryUsage.heapTotal)}\n` + 
                `RSS: ${filesize(memoryUsage.rss)}`,
                true)
            .addField('Links', data.Links, false)
            .setFooter(data.AppCopyright)
            .setColor(0x6B8AFB);

        return textChannel.send({ embed: response });
    }
}

class PreparedData {
    links:AboutMeLink[] = [
        new AboutMeLink(pjson.homepage, 'Homepage'),
        new AboutMeLink(pjson.repository.url, 'Source Repository'),
        new AboutMeLink(pjson.bugs.url, 'Bug Reporting'),
    ];

    constructor() {
    }

    public get AppName():string { return pjson.name; }
    public get AppDescription():string { return pjson.description; }
    public get AppVersion():string { return pjson.version; }
    public get AppAuthor():string { return `${pjson.author.name} <${pjson.author.email}>`; }
    public get AppRepository():string { return `${pjson.repository.url}`; }
    public get AppLicense():string { return `${pjson.license}`; }

    public get AppCopyright():string { return `© ${new Date().getFullYear()}, ${pjson.author.name}, All rights reserved!`; }

    public get Links():string {
        return this.links.map((link:AboutMeLink) => {
            return link.URL ? link.toString() : '';
        }).filter((value:string) => {
            return !(!value);
        }).join('\n');
    }
}

class AboutMeLink {
    url:string;
    name:string;

    constructor(url:string, name?:string) {
        this.url = url;
        this.name = name || url;
    }

    public get URL():string { return this.url; }
    public get Name():string { return this.name; }

    public toString():string {
        return this.name ? `${this.name}: ${this.url}` : this.url;
    }
}