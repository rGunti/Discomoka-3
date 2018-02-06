import { ServerRoleMapping } from "../db/model/ServerRoleMapping";
import { GuildMember, Role, Snowflake } from "discord.js";
import { VServerRolePermission } from "../db/model/VServerRolePermission";
import * as async from "async";


export class PermissionChecker {
    /**
     * Checks the permissions of a given Guild Member.
     * If permissions is an array, all permissions have to be present to continue.
     * If the requested permission(s) are present, the Promise will resolve, otherwise it will be rejected.
     * @param member Member to test
     * @param permissionID Permission ID or Permission IDs to test for
     */
    static async checkPermission(member:GuildMember, permissionID:string|string[]):Promise<void> {
        return new Promise<void>(async (resolve, reject) => {
            let permissions = await PermissionChecker.getMemberPermissions(member);
            if (permissionID instanceof Array) {
                async.eachSeries(permissionID as string[], (i:string, callback) => {
                    if (permissions.indexOf(i) < 0) {
                        callback(new PermissionMissingError(member, i));
                    } else {
                        callback();
                    }
                }, (err:Error|any) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                })
            } else {
                if (permissions.indexOf(permissionID) >= 0) {
                    resolve();
                } else {
                    reject(new PermissionMissingError(member, permissionID));
                }
            }
        });
    }

    /**
     * Gets all permissions a user has and returns their keys in a list of strings.
     * The permissions will be gather in combination so all role permissions will be
     * combined.
     * @param member Member to get the permissions for
     */
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

    /**
     * Returns a list of Role IDs of a members Discord roles
     * @param member Member to get Role IDs from
     */
    private static async getDiscordRolesOfMember(member:GuildMember):Promise<string[]> {
        return new Promise<string[]>((resolve, reject) => {
            resolve(member.roles.keyArray().map(i => i.toString()));
        });
    }

    /**
     * Returns a Map where the key is the Discord Role ID and the value is the Server-Role-to-Bot-Role-Mapping
     * @param serverID Server / Guild ID to filter by
     */
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

    /**
     * Gets all server-role-mappings for a given server
     * @param serverID Server to filter for
     */
    private static async getServerRoleMappings(serverID:string):Promise<ServerRoleMapping[]> {
        return new Promise<ServerRoleMapping[]>((resolve, reject) => {
            ServerRoleMapping.findAll({
                where: { serverID: serverID }
            }).then((mappings:ServerRoleMapping[]) => {
                resolve(mappings);
            }).catch(reject);
        });
    }

    /**
     * Returns a list of Permission IDs for a given server and a given role or list of roles.
     * @param serverID Server to filter for
     * @param roleID Role ID(s) to filter for
     */
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

/**
 * And error that is generally thrown when a Permission check failed.
 * The error will provide the member that was checked and the permission ID 
 * that was checked negatively.
 * Note that this error does not contain ALL missing permissions that were checked
 * but rather the one that was encountered first.
 * Permission checks are generally run in order of entry.
 */
export class PermissionMissingError extends Error {
    constructor(member:GuildMember, missingPermission:string) {
        super(`Member ${member.id} is missing permission ${missingPermission}`);

        this.member = member;
        this.missingPermission = missingPermission;
    }

    member:GuildMember;
    missingPermission:string;
}
