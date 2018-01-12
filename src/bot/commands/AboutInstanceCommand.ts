import * as moment from 'moment';
import 'moment-duration-format';
import { Command, CommandoClient, CommandMessage } from 'discord.js-commando';
import { TextChannel, RichEmbed, Client, Message } from 'discord.js';
import { Duration, Format, Moment } from 'moment';

export class AboutInstanceCommand extends Command {
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
    }

    public run(msg:CommandMessage, args:string|object|string[], fromPattern:boolean):Promise<Message|Message[]> {
        let textChannel = msg.message.channel;

        let uptime:Duration = moment.duration(process.uptime(), "seconds");
        let uptimeStr:string = uptime.format('d [d] hh:mm:ss');
        let startup:Moment = moment().subtract(uptime);
        let startupStr:string = startup.format('YYYY-MM-DD HH:mm:ss');

        let response:RichEmbed = new RichEmbed()
            .setAuthor(this.client.user.username, this.client.user.avatarURL)
            .setTitle(`About Discomoka 3`)
            .setDescription(`<Discomoka3 Description here>`)
            .addField('Version', '<Version here>', true)
            .addField('Platform', `Node.JS ${process.version}`, true)
            .addField('Uptime', `${uptimeStr}\n${startupStr}`, true)
            .addField('Server Time', moment().format('YYYY-MM-DD HH:mm:ss'))
            .addField('Links', '<Links here>', false)
            .setFooter(`© ${new Date().getFullYear()}, rGunti, All rights reserved!`);

        return textChannel.send({ embed: response });
    }
}