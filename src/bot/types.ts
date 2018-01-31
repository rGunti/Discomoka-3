import { ArgumentType, CommandoClient, CommandMessage, Argument } from "discord.js-commando";
import * as emoji from "node-emoji";

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