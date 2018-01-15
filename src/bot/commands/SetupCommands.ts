import { Command, CommandoClient, CommandMessage } from "discord.js-commando";
import { Message, Role } from "discord.js";
import { getMessage, MessageLevel } from "../../utils/discord-utils";
import * as DiscomokaRole from "../../db/model/Role"
import * as async from "async";
import { ServerRoleMapping } from './../../db/model/ServerRoleMapping';

export class SetupRolesCommand extends Command {
    constructor(client:CommandoClient) {
        super(client, {
            name: 'rolesetup',
            group: 'setup',
            memberName: 'rolesetup',
            description: 'Sets up Permissions for this server. ' + 
                'This command should be executed once the Bot joins the server. ' + 
                'The command can only be executed by the server owner.',
            guildOnly: true,
            args: [
                {
                    key: 'adminRole',
                    type: 'role',
                    label: 'Admin Role',
                    prompt: 'Enter the server role which acts as "Administrator":'
                }, {
                    key: 'moderatorRole',
                    type: 'role',
                    label: 'Moderator Role',
                    prompt: 'Enter the server role which acts as "Moderator":'
                }, {
                    key: 'supporterRole',
                    type: 'role',
                    label: 'Supporter Role',
                    prompt: 'Enter the server role which acts as "Supporter":'
                }, {
                    key: 'memberRole',
                    type: 'role',
                    label: 'Member Role',
                    prompt: 'Enter the server role which acts as "Member":'
                }, {
                    key: 'guestRole',
                    type: 'role',
                    label: 'Guest Role',
                    prompt: 'Enter the server role which acts as "Guest":'
                }
            ],
            throttling: { usages: 1, duration: 3 }
        });
    }

    public run(msg:CommandMessage, args, fromPattern:boolean):Promise<Message|Message[]> {
        if (msg.author.id !== msg.guild.ownerID) {
            return msg.say(getMessage(MessageLevel.PermissionError,
                'Access denied',
                `You are not allowed to execute this command because you are not the server owner!`
            ));
        }
        let serverID = msg.guild.id;
        let { adminRole, moderatorRole, supporterRole, memberRole, guestRole } = args;
        let preparedItems = [
            [ DiscomokaRole.Role.KEY_OWNER, msg.guild.ownerID ],
            [ DiscomokaRole.Role.KEY_ADMIN, (<Role>adminRole).id ],
            [ DiscomokaRole.Role.KEY_MOD, (<Role>moderatorRole).id ],
            [ DiscomokaRole.Role.KEY_SUPPORT, (<Role>supporterRole).id ],
            [ DiscomokaRole.Role.KEY_MEMBER, (<Role>memberRole).id ],
            [ DiscomokaRole.Role.KEY_GUEST, (<Role>guestRole).id ]
        ];
        async.each(preparedItems, (item:string[], callback) => {
            ServerRoleMapping.findOrCreate({
                where: {
                    serverID: serverID,
                    roleID: item[0]
                },
                defaults: {
                    serverID: serverID,
                    roleID: item[0],
                    serverRoleID: item[1]
                }
            }).spread((mapping:ServerRoleMapping, created:boolean) => {
                if (!created) {
                    mapping.serverRoleID = item[1];
                    mapping.save()
                        .then((mapping:ServerRoleMapping) => {
                            callback();
                        });
                } else {
                    callback();
                }
            });
        }, (err:Error) => {
            msg.say(getMessage(MessageLevel.Success,
                'Setup completed',
                'Your roles have been configured. If you want to change these settings again, rerun this command.'
            ));
        });
    }
}