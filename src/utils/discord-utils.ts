import { TextChannel, Message } from 'discord.js';

export enum MessageLevel {
    None = '',
    Success = ':white_check_mark:',
    Info = ':information_source:',
    Warning = ':warning:',
    Error = ':no_entry_sign:',
    PermissionError = ':no_entry:'
}

export function getMessage(level:MessageLevel, title:string, message:string):string {
    return `${level} **${title}**\n${message}`;
}

export function sendMessage(channel:TextChannel, level:MessageLevel, title:string, message:string):Promise<Message|Message[]> {
    return channel.send(getMessage(level, title, message));
}

export function autoResolveMessage(channel:TextChannel, level:MessageLevel, title:string, message:string, callback:(msg:Message) => void) {
    sendMessage(channel, level, title, message).then(callback);
}
