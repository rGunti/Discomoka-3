import { ArgumentType, CommandoClient, CommandMessage, Argument } from "discord.js-commando";
import * as emoji from "node-emoji";
import * as moment from "moment";

export class EmojiArgument extends ArgumentType {
    constructor(client:CommandoClient) {
        super(client, 'emoji')
    }

    public parse(value:string, msg:CommandMessage, arg:Argument):any|Promise<any> {
        if (msg.guild && msg.guild.emojis.has(value)) {
            return msg.guild.emojis.get(value).id;
        } else if (this.client.emojis.has(value)) {
            return this.client.emojis.get(value).id;
        } else {
            return emoji.get(value).replace(/:/g, '').trim();
        }
    }

    public validate(value:string, msg:CommandMessage, arg:Argument):boolean|string|Promise<boolean|string> {
        if ((msg.guild && msg.guild.emojis.has(value)) || this.client.emojis.has(value) || emoji.hasEmoji(value)) {
            // Registered Emoji in client or on server 
            // or known emoji
            return true;
        } else {
            return "This emoji cannot be found";
        }
    }

}

export class TimespanArgument extends ArgumentType {
    static REGEX_CHECK = /([0-9]+[dhms] ?)+/;
    static REGEX_PARSE = /([0-9]+[dhms])+/g;
    static CONVERSION_TABLE = {
        'd': 24 * 60 * 60,
        'h': 60 * 60,
        'm': 60,
        's': 1
    };

    constructor(client:CommandoClient) {
        super(client, 'time')
    }

    public parse(value:string, msg:CommandMessage, arg:Argument):any|Promise<any> {
        let sumSeconds = 0;
        value.match(TimespanArgument.REGEX_PARSE).forEach((item:string, index:number, array:string[]) => {
            // Get last character
            let unit = item.substring(item.length - 1);
            let value = Number.parseInt(item.substring(0, item.length - 1));
            if (unit in TimespanArgument.CONVERSION_TABLE) {
                sumSeconds += value * TimespanArgument.CONVERSION_TABLE[unit];
            }
        });
        return sumSeconds;
    }

    public validate(value:string, msg:CommandMessage, arg:Argument):boolean|string|Promise<boolean|string> {
        if (TimespanArgument.REGEX_CHECK.test(value)) {
            return true;
        } else {
            return "Invalid time format. Enter timespan in the following format: " + 
                "```\n" + 
                "<days>d <hours>h <minutes>m <seconds>s\n" +
                "Example: 1h 30m => 1 hour, 30 minutes\n" + 
                "```";
        }
    }
}
