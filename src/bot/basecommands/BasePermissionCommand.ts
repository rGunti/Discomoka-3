import { Command, CommandoClient, CommandInfo } from 'discord.js-commando';
import { Message } from 'discord.js';
import { CommandMessage } from 'discord.js-commando';
import { PermissionChecker, PermissionMissingError } from './../../perm/permchecker';
import { getMessage, MessageLevel } from '../../utils/discord-utils';

export abstract class BasePermissionCommand extends Command {
    private requiredPermissions:string[]

    constructor(client:CommandoClient, info:CommandInfo, requiredPermissions:string[] = []) {
        super(client, info);
        this.requiredPermissions = requiredPermissions;
    }

    public run(msg:CommandMessage, args:string|object|string[], fromPattern:boolean):Promise<Message|Message[]> {
        let self = this;
        return new Promise<Message|Message[]>((resolve, reject) => {
            PermissionChecker.checkPermission(msg.member, self.requiredPermissions)
                .then(() => {
                    self.runPermitted(msg, args, fromPattern)
                        .then(resolve)
                        .catch(reject);
                })
                .catch((err:PermissionMissingError) => {
                    let message = getMessage(MessageLevel.PermissionError, 
                        'Permission missing', 
                        "You don't have the required permission to execute this command. If you believe this is an error, " +
                        "contact your servers administrator.\n" +
                        `Required Permission: ${err.missingPermission}`
                    );
                    msg.reply(message).then(resolve).catch(reject);
                });
        });
    }

    protected abstract runPermitted(msg:CommandMessage, args:string|object|string[], fromPattern:boolean):Promise<Message|Message[]>;
}
