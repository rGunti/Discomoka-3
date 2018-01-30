import { ServerRoleMapping } from "../db/model/ServerRoleMapping";
import { GuildMember, Role, Snowflake } from "discord.js";
import { VServerRolePermission } from "../db/model/VServerRolePermission";
import * as async from "async";


export class PermissionChecker {
    static async getMemberPermissions(member:GuildMember):Promise<string[]> {
        let serverID = member.guild.id;

        return new Promise<string[]>(async (resolve, reject) => {
            // Convert list to map (Discord Role ID => Mapping)
            let mappings = await PermissionChecker.getServerRoleToMappingsMap(serverID);
            let userDbRoles = (await PermissionChecker.getDiscordRolesOfMember(member))
                .filter(r => mappings.has(r))
                .map(r => mappings.get(r).roleID);
            
            // Resolve Permissions
            PermissionChecker
                .getPermissionsByServerIdAndRoles(member.guild.id, userDbRoles)
                .then(resolve)
                .catch(reject);
        });
    }

    private static async getDiscordRolesOfMember(member:GuildMember):Promise<string[]> {
        return new Promise<string[]>((resolve, reject) => {
            resolve(member.roles.keyArray().map(i => i.toString()));
        });
    }

    private static async getServerRoleToMappingsMap(serverID:string):Promise<Map<string, ServerRoleMapping>> {
        return new Promise<Map<string, ServerRoleMapping>>((resolve, reject) => {
            PermissionChecker.getServerRoleMappings(serverID)
                .then((mappings:ServerRoleMapping[]) => {
                    resolve(new Map(
                        mappings.map(m => [m.serverRoleID, m] as [string, ServerRoleMapping])
                    ));
                })
                .catch(reject);
        });
    }

    private static async getServerRoleMappings(serverID:string):Promise<ServerRoleMapping[]> {
        return new Promise<ServerRoleMapping[]>((resolve, reject) => {
            ServerRoleMapping.findAll({
                where: { serverID: serverID }
            }).then((mappings:ServerRoleMapping[]) => {
                resolve(mappings);
            }).catch(reject);
        });
    }

    private static async getPermissionsByServerIdAndRoles(serverID:string, roleID:string|string[]):Promise<string[]> {
        return new Promise<string[]>((resolve, reject) => {
            // Resolve Permissions
            VServerRolePermission.findAll({
                where: {
                    serverID: serverID,
                    roleID: roleID
                },
                distinct: true,
                attributes: ['permID']
            }).then((value:VServerRolePermission[]) => {
                let roleIDs:string[] = value.map(v => v.permID).filter(s => !(!s));
                resolve(roleIDs);
            }).catch(reject); // TODO: Maybe put a custom error message here
        });
    }
}