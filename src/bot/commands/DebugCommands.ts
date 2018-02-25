import { Command, CommandoClient, CommandMessage } from "discord.js-commando";
import { Message, User, GuildMember, TextChannel, Role, RichEmbed } from "discord.js";
import { ServerRoleMapping } from "../../db/model/ServerRoleMapping";
import * as DiscomokaRole from "../../db/model/Role";
import { RolePermission } from "../../db/model/RolePermission";
import { Permission } from "../../db/model/Permission";
import { Sequelize } from "sequelize-typescript/lib/models/Sequelize";
import { VServerRolePermission } from "../../db/model/VServerRolePermission";
import { PermissionChecker } from './../../perm/permchecker';
import { BasePermissionCommand } from "../basecommands/BasePermissionCommand";
import { getMessage, MessageLevel } from "../../utils/discord-utils";

const pad = require("pad");

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

export class FillChannelCommand extends Command {
    constructor(client:CommandoClient) {
        super(client, {
            name: 'fill',
            group: 'debug',
            memberName: 'fill',
            description: 'Fills a channel with a given number of messages.',
            guildOnly: true,
            ownerOnly: true,
            args: [
                {
                    key: 'count',
                    type: 'integer',
                    label: 'Number of Messages',
                    prompt: 'Enter a number of messages to insert'
                }
            ],
            throttling: { usages: 1, duration: 10 }
        })
    }

    public async run(msg:CommandMessage, args, fromPattern:boolean):Promise<Message|Message[]> {
        let self = this;
        let { count } = args;
        let messages:Message[] = [];

        for (let i = 0; i < count; i++) {
            await msg.channel.send(`This is message #${i + 1} / ${count}`);
        }
        return null;
    }
}

export class PermissionGridCommand extends BasePermissionCommand {
    constructor(client:CommandoClient) {
        super(client, {
            name: 'permgrid',
            group: 'debug',
            memberName: 'permgrid',
            description: 'Shows a permission grid for the current server.',
            guildOnly: true,
            throttling: { usages: 1, duration: 10 }
        }, [
            'Commands.Allowed'
        ]);
    }

    public async runPermitted(msg:CommandMessage, args, fromPattern:boolean):Promise<Message|Message[]> {
        let serverPermissions:VServerRolePermission[] = await VServerRolePermission.findAll({
            attributes: ['serverID', 'serverRoleID', 'roleID', 'permID'],
            where: {
                serverID: msg.guild.id
            },
            order: [
                ['roleID', 'ASC'],
                ['permID', 'ASC']
            ]
        });
        let permissions:Permission[] = await Permission.findAll();
        let roles:DiscomokaRole.Role[] = await DiscomokaRole.Role.findAll();
        let roleMap = roles.reduce((map, role) => {
            map[role.id] = role.name;
            return map;
        }, {});

        let rolePermissionMap = permissions.reduce((map, permission) => {
            let permRoles = serverPermissions.filter((v:VServerRolePermission, index:number, a:VServerRolePermission[]):boolean => {
                return v.permID == permission.id;
            });
            map.set(permission.id, permRoles.map(v => v.roleID));
            return map;
        }, new Map<string, any>());

        let heading = pad('Permission', 40) + ' |';
        let line = pad('', 41, '-') + '|';
        roles.forEach((role) => {
            heading += `${role.name.substr(0, 3)}|`;
            line += pad('', 3, '-') + '|';
        });
        heading += `\n${line}`;

        let lines:string[] = [];

        permissions.forEach((perm) => {
            let line = `${pad(perm.id, 40)} |`;
            roles.forEach((role) => {
                if (!rolePermissionMap.has(perm.id)) {
                    line += '   |';
                } else {
                    let hasPermission = !(!(rolePermissionMap.get(perm.id).find(i => i == role.id)));
                    line += ` ${hasPermission ? 'X' : ' '} |`;
                }
            });
            lines.push(line);
        });

        let message = lines.join('\n');
        //let currentMessage = "";
        //for (let i = 0; i < lines.length; i++) {
        //    if (i % 10 == 0) {
        //        if (currentMessage) {
        //            messages.push(currentMessage);
        //            currentMessage = "";
        //        }
        //        currentMessage += heading + '\n';
        //    }
        //    currentMessage += lines[i] + '\n';
        //}

        return msg.channel.send('```\n' + `${heading}\n${message}` + '\n```');
    }
}

export class PermissionDetailCommand extends BasePermissionCommand {
    constructor(client:CommandoClient) {
        super(client, {
            name: 'perminfo',
            group: 'debug',
            memberName: 'perminfo',
            description: 'Displays info about a specific permission key.',
            guildOnly: true,
            args: [
                {
                    key: 'permKey',
                    type: 'string',
                    label: 'Permission Key',
                    prompt: 'Enter the Permission Key which you want to get details to:'
                }
            ],
            throttling: { usages: 1, duration: 10 }
        }, [
            'Commands.Allowed'
        ])
    }

    public async runPermitted(msg:CommandMessage, args, fromPattern:boolean):Promise<Message|Message[]> {
        let { permKey } = args;
        let permission = await Permission.findOne({
            where: { id: permKey }
        });

        if (permission) {
            let reply = new RichEmbed()
                .setTitle(permission.id)
                .setDescription(permission.description);
            return msg.channel.send(reply);
        } else {
            return msg.reply(getMessage(
                MessageLevel.Error,
                `404 Permission Not Found`,
                "Permission `" + permKey + "` does not exist."
            ));
        }
    }
}
