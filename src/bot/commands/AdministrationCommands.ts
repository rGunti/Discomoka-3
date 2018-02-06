import { BasePermissionCommand } from "../basecommands/BasePermissionCommand";
import { CommandoClient, CommandMessage } from "discord.js-commando";
import { Message, Permissions, TextChannel, Collection, Snowflake } from 'discord.js';
import * as async from "async";
import { getMessage, MessageLevel } from "../../utils/discord-utils";

export class ClearChatCommand extends BasePermissionCommand {
    constructor(client:CommandoClient) {
        super(client, {
            name: 'clear',
            group: 'admin',
            memberName: 'clear',
            description: 'Clears the current chat',
            aliases: ['destroychat'],
            throttling: {
                usages: 1,
                duration: 5
            }
        }, [
            'Commands.Allowed'
        ])
    }

    public hasPermission(msg:CommandMessage):boolean {
        return msg.member.hasPermission("MANAGE_MESSAGES");
    }
    
    protected async runPermitted(msg:CommandMessage, args, fromPattern:boolean):Promise<Message|Message[]> {
        let self = this;
        let channel:TextChannel = msg.channel as TextChannel;

        let messages:Message[] = await self.getAllMessagesFromChannel(channel);
        let deleteProcessMessage:Message = (await msg.reply(getMessage(
            MessageLevel.Processing, `Deleting ${messages.length} messages`, "This might take a while..."
        ))) as Message;

        self.deleteMessages(messages)
            .then((skippedMessages:number) => {
                deleteProcessMessage.delete();
                msg.reply(getMessage(
                    MessageLevel.Success, 
                    `${messages.length - skippedMessages} / ${messages.length} messages deleted`
                )).then((m:Message) => {
                    setTimeout(() => { m.delete() }, 5000);
                });
            })
            .catch((reason:any) => {
                msg.reply(getMessage(MessageLevel.Error, "Failed to delete messages", reason));
            });
        return null;
    }

    private async getAllMessagesFromChannel(channel:TextChannel):Promise<Message[]> {
        let self = this;
        let messages:Message[] = [];
        let lastMessage:Message = null;

        let step = await self.getMessages(channel);
        while (step.length > 0) {
            messages = messages.concat(step);
            lastMessage = step[step.length - 1];
            step = await self.getMessages(channel, lastMessage);
        }
        
        return messages;
    }

    private getMessages(channel:TextChannel, lastMessage:Message = null):Promise<Message[]> {
        return new Promise<Message[]>((resolve, reject) => {
            channel.fetchMessages({
                limit: 100,
                before: lastMessage ? lastMessage.id : null
            }).then((messages:Collection<string, Message>) => {
                resolve(messages.array());
            }).catch(reject);
        });
    }

    private deleteMessages(messages:Message[]):Promise<number> {
        return new Promise<number>((resolve, reject) => {
            let skippedMessages:number = 0;
            async.eachLimit(messages, 50, (m:Message, callback) => {
                if (m.deletable) {
                    m.delete()
                        .then(m => { callback() })
                        .catch(e => { skippedMessages += 1; callback(); });
                } else {
                    skippedMessages += 1;
                    callback();
                }
            }, (err:Error|any) => {
                if (err) reject(err);
                else resolve(skippedMessages);
            });
        });
    }
}