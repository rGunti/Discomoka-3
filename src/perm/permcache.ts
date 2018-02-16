
import { ServerRoleMapping } from './../db/model/ServerRoleMapping';
import { VServerRolePermission } from '../db/model/VServerRolePermission';
import * as async from "async";
import * as debug from "debug";
import { GuildMember } from 'discord.js';

const log = debug("discomoka3:PermissionCache");

export class PermissionCache {
    /* *** Singleton *** */
    private static instance:PermissionCache;
    public static get Instance():PermissionCache {
        if (!PermissionCache.instance) {
            PermissionCache.instance = new PermissionCache();
        }
        return PermissionCache.instance;
    }

    /* *** Instance *** */
    private constructor() {
        this.map = new Map<string, Map<string, string[]>>();
        log("Initialized Permission Cache");
    }

    private map:Map<string, Map<string, string[]>>;

    private addEntry(serverID:string, discordRoleID:string, permission:string) {
        if (!this.map.has(serverID)) {
            this.map.set(serverID, new Map<string, string[]>());
            log(`Added cache for Server ${serverID}`);
        }
        let server = this.map.get(serverID);
        if (!server.has(discordRoleID)) {
            server.set(discordRoleID, []);
            log(`Added cache for Role ${serverID}/${discordRoleID}`);
        }
        let permissions = server.get(discordRoleID);
        if (permissions.indexOf(permission) < 0) {
            permissions.push(permission);
        }
    }

    private async processDbItems(items:VServerRolePermission[]):Promise<void> {
        let self = this;
        return new Promise<void>((resolve, reject) => {
            async.eachSeries(items, (e, callback) => {
                self.addEntry(e.serverID, e.serverRoleID, e.permID);
                callback();
            }, (err) => {
                log(`${items.length} items processed`);
                resolve();
            });
        })
    }

    public clear() {
        this.map.clear();
        log("Permission Cache cleared");
    }

    public async refresh() {
        log("Refreshing Permission Cache...");
        this.clear();

        let permissions = await VServerRolePermission.findAll({
            attributes: ['serverID', 'serverRoleID', 'permID']
        });
        await this.processDbItems(permissions);
        log("Permission cache refreshed");
    }

    public async update(serverID:string) {
        log(`Updating Data for Server ${serverID} ...`);

        let permissions = await VServerRolePermission.findAll({
            attributes: ['serverID', 'serverRoleID', 'permID'],
            where: { serverID: serverID }
        });
        await this.processDbItems(permissions);
        log(`Permission cache for Server ${serverID} updated`);
    }

    public hasPermission(serverID:string, discordRoleID:string, permissionKey:string):boolean {
        if (!this.map.has(serverID)) {
            log(`Server ${serverID} is missing in cache`);
            return false;
        }
        let server = this.map.get(serverID);
        if (!server.has(discordRoleID)) {
            log(`Role ${serverID}/${discordRoleID} is missing in cache`);
            return false;
        }
        let permissions = server.get(discordRoleID);
        return permissions.indexOf(permissionKey) >= 0;
    }

    public hasMemberPermission(member:GuildMember, permission:string):boolean {
        let roles:string[] = member.roles.map(r => r.id);
        for (let role of roles) {
            if (this.hasPermission(member.guild.id, role, permission)) {
                return true;
            }
        }
        return false;
    }

    public hasMemberPermissions(member:GuildMember, permissions:string[]):boolean {
        let roles:string[] = member.roles.map(r => r.id);
        for (let role of roles) {
            for (let permission of permissions) {
                if (this.hasPermission(member.guild.id, role, permission)) {
                    return true;
                }
            }
        }
        return false;
    }
}
