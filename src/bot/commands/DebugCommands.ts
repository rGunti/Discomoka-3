import { Command, CommandoClient, CommandMessage } from "discord.js-commando";
import { Message, User, GuildMember, TextChannel, Role } from "discord.js";
import { ServerRoleMapping } from "../../db/model/ServerRoleMapping";
import * as DiscomokaRole from "../../db/model/Role";
import { RolePermission } from "../../db/model/RolePermission";
import { Permission } from "../../db/model/Permission";
import { Sequelize } from "sequelize-typescript/lib/models/Sequelize";
import { VServerRolePermission } from "../../db/model/VServerRolePermission";

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
        // Get Mapping for this server
        ServerRoleMapping.findAll({
            where: {
                serverID: responseChannel.guild.id
            }
        }).then((roles:ServerRoleMapping[]) => {
            // Convert list to map (Discord Role ID => Mapping)
            let mappings = new Map<string, ServerRoleMapping>();
            for (let role of roles) {
                mappings.set(role.serverRoleID, role);
            }

            // For each Discord role check if it has mapping
            // If so, write it down
            let hasRoles:string[] = [];
            for (let i of member.roles.keyArray()) {
                let discordRole:Role = member.roles.get(i);
                if (mappings.has(discordRole.id)) {
                    let mapping = mappings.get(discordRole.id);
                    hasRoles.push(mapping.roleID);
                }
            }

            // Resolve Permissions
            responseChannel.sendMessage(
                `Roles of **${member.nickname || member.displayName}**: ` + 
                '```\n * ' + hasRoles.join('\n * ') + '\n```'
            );

            VServerRolePermission.findAll({
                where: {
                    serverID: member.guild.id,
                    roleID: hasRoles
                },
                distinct: true,
                attributes: ['permID']
            }).then((value:VServerRolePermission[]) => {
                let roleIDs:string[] = value.map(v => v.permID).filter(s => !(!s));
                responseChannel.sendMessage(
                    `Permissions of **${member.nickname || member.displayName}**\n` +
                    '```\n - ' + roleIDs.join('\n - ') + '\n```'
                );
            });
        });
    }
}