import { ArgumentType, CommandoClient, CommandMessage, Argument } from "discord.js-commando";
import * as emoji from "node-emoji";
import * as moment from "moment";
import { codifyStringMultiline } from "../utils/discord-utils";

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

export class DateTimeArgument extends ArgumentType {
    static REGEX_PARSE = /(\d{4})-(\d{1,2})-(\d{1,2})\s(\d{1,2})\:(\d{1,2})(\:(\d{1,2}))?/;
    static REGEX_CHECK = /(\d{4})-(\d{1,2})-(\d{1,2})\s(\d{1,2})\:(\d{1,2})(\:(\d{1,2}))?/g;

    static RIDX_YEAR = 1;
    static RIDX_MONTH = 2;
    static RIDX_DAY = 3;
    static RIDX_HOURS = 4;
    static RIDX_MINS = 5;
    static RIDX_SECS = 7;

    constructor(client:CommandoClient) {
        super(client, 'datetime');
    }

    public parse(value:string, msg:CommandMessage, arg:Argument):any|Promise<any> {
        let match = value.match(DateTimeArgument.REGEX_PARSE);
        let year  = Number.parseInt(match[DateTimeArgument.RIDX_YEAR]),
            month = Number.parseInt(match[DateTimeArgument.RIDX_MONTH]),
            day   = Number.parseInt(match[DateTimeArgument.RIDX_DAY]),
            hrs   = Number.parseInt(match[DateTimeArgument.RIDX_HOURS]),
            mins  = Number.parseInt(match[DateTimeArgument.RIDX_MINS]),
            secs  = Number.parseInt(match[DateTimeArgument.RIDX_SECS]);
        
        let date = new Date(
            Date.UTC(
                year, 
                month - 1, // <== -1, because JavaScript takes month as 0-indexed ... for some reason?
                day, 
                hrs, 
                mins, 
                secs|0  // <== 0, if the user did not enter a second number
            ));
        
        return Number.isNaN(date.valueOf()) ? undefined : date;
    }

    public validate(value:string, msg:CommandMessage, arg:Argument):boolean|string|Promise<boolean|string> {
        if (DateTimeArgument.REGEX_PARSE.test(value)) {
            return true;
        } else {
            return "Invalid date-time format. Enter a date and time in the following format: " +
                codifyStringMultiline(
                    "<year>-<month>-<day> <hours>:<minutes>[:<seconds>]\n"
                ) +
                "Examples:" +
                codifyStringMultiline(
                    "- 2018-05-05 15:12\n" +
                    "- 2018-2-15 0:28:12\n"
                ) + 
                "Please note that your date will be **processed in UTC / GMT+0** so adjust your entry according " +
                "to your local timezone.";
        }
    }
}
