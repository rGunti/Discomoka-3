import { Command, CommandoClient, CommandMessage } from "discord.js-commando";
import { Message, User, GuildMember, TextChannel, Role } from "discord.js";
import { ServerRoleMapping } from "../../db/model/ServerRoleMapping";
import * as DiscomokaRole from "../../db/model/Role";
import { RolePermission } from "../../db/model/RolePermission";
import { Permission } from "../../db/model/Permission";
import { Sequelize } from "sequelize-typescript/lib/models/Sequelize";
import { VServerRolePermission } from "../../db/model/VServerRolePermission";
import { PermissionChecker } from './../../perm/permchecker';

export class OwnPermissionsCommand extends Command {
    static USER_EMPTY:string = "EMPTY";

    constructor(client:CommandoClient) {
        super(client, {
            name: 'testperm',
            group: 'debug',
            memberName: 'testperm',
            description: 'Tests a users permissions. ' + 
                'If no user is given the user who sent the messages gets tested.',
            guildOnly: true,
            args: [
                {
                    key: 'user',
                    type: 'user',
                    label: 'User to test',
                    prompt: 'Enter a user to test',
                    default: OwnPermissionsCommand.USER_EMPTY
                }
            ],
            throttling: { usages: 1, duration: 10 }
        });
    }

    public run(msg:CommandMessage, args, fromPattern:boolean):Promise<Message|Message[]> {
        let self = this;
        let user = args.user;
        let checkUser:GuildMember|Promise<GuildMember>;
        if (user instanceof User) {
            checkUser = msg.guild.fetchMember(<User>user);
        } else if (user === OwnPermissionsCommand.USER_EMPTY) {
            checkUser = msg.member;
        }
        
        if (checkUser instanceof Promise) {
            checkUser.then((checkUser:GuildMember) => {
                self.checkPermission(checkUser, <TextChannel>msg.channel);
            });
        } else {
            this.checkPermission(checkUser, <TextChannel>msg.channel);
        }
        
        return null;
    }

    checkPermission(member:GuildMember, responseChannel:TextChannel):void {
        PermissionChecker.getMemberPermissions(member)
            .then((permissions:string[]) => {
                responseChannel.sendMessage(
                    `Permissions of **${member.nickname || member.displayName}**:\n` +
                    '```\n - ' + permissions.join('\n - ') + '\n```'
                );
            });
    }
}