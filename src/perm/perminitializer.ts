import { Permission } from './../db/model/Permission';
import * as debug from 'debug';
import * as async from 'async';
import { Role } from '../db/model/Role';
import { RolePermission } from '../db/model/RolePermission';
import { PermissionCache } from './permcache';

export class PermissionInitializer {
    static log:debug.IDebugger = debug(`discomoka3:Permissions:Initializer`);
    static defaultPermissions = [
        // Generic Permissions
        ["Commands.Allowed",                        "When enabled a user with this permission is allowed to run commands. This permission is needed to execute any command on a server."],
        // Music Playback
        ["Music.Play",                              "Can start / stop playback"],
        ["Music.Skip",                              "Can skip the currently playing song"],
        ["Music.SkipVote.Start",                    "Can start a skip-vote for the currently playing track"],
        ["Music.SkipVote.Vote",                     "Can vote to skip a track"],
        // Music Library Management
        ["MusicLib.Track.Download",                 "Can add a track to the servers music library"],
        ["MusicLib.Track.DownloadPlaylist",         "Can add a playlist to the servers music library (e.g. a YouTube playlist)"],
        ["MusicLib.Track.Delete",                   "Can delete a track from the servers music library"],
        ["MusicLib.Track.VoteAdd.Start",            "Can start a (server-wide) vote on adding a new track to the servers music library"],
        ["MusicLib.Track.VoteAdd.Participate",      "Can participate in a (server-wide) vote on adding a track"],
        ["MusicLib.Track.VoteRemove.Start",         "Can start a (server-wide) vote on removing a track to the servers music library"],
        ["MusicLib.Track.VoteRemove.Participate",   "Can participate in a (server-wide) vote on removing a track"],
        ["MusicLib.Playlist.Create",                "Can create (and manage) a playlist on the servers music library"],
        ["MusicLib.Playlist.Delete",                "Can delete a playlist on the server"],
        // Scoring System
        ["Score.Setup",                             "Can setup the scoring system on the server"],
        ["Score.Set",                               "Can set a users score balance to a given value"],
        ["Score.Add",                               "Can add (or remove) a given amount from a users score balance"],
        // Reddit
        ["Reddit.Setup",                            "Can setup Reddit post puller on the server"],
        // Other Permissions
        ["Bot.ReportBug",                           "Can send a bug report using !bugreport command to Github"],
        ["Vote.Start",                              "Start a new (server-wide) vote on a given topic"]
        //["Vote.Participate",                        "Can take part in a (server-wide) vote on a given topic"]
    ];

    static defaultRoles = [
        [Role.KEY_GUEST,   'Guest',            'Users who are not (yet) active on the server. Usually @everyone.',
        []],
        [Role.KEY_MEMBER,  'Member',           'Users who are active on the server.',
        ['Commands.Allowed', 
        'Music.SkipVote.Vote', 
        'MusicLib.Track.VoteAdd.Start', 'MusicLib.Track.VoteAdd.Participate',
        'MusicLib.Track.VoteRemove.Participate']],
        [Role.KEY_SUPPORT, 'Supporter',        'Users who help out Moderators perform mod tasks.',
        ['Commands.Allowed', 
        'Music.Play', 'Music.Skip',
        'Music.SkipVote.Vote', 
        'MusicLib.Track.Download',
        'MusicLib.Track.VoteAdd.Start', 'MusicLib.Track.VoteAdd.Participate',
        'MusicLib.Track.VoteRemove.Start', 'MusicLib.Track.VoteRemove.Participate',
        'Score.Add',
        'Vote.Start']],
        [Role.KEY_MOD,     'Moderator',        'Users who moderate the server and keep everyone save.',
        ['Commands.Allowed', 
        'Music.Play', 'Music.Skip',
        'Music.SkipVote.Start', 'Music.SkipVote.Vote', 
        'MusicLib.Track.Download', 'MusicLib.Track.DownloadPlaylist', 'MusicLib.Track.Delete',
        'MusicLib.Track.VoteAdd.Start', 'MusicLib.Track.VoteAdd.Participate',
        'MusicLib.Track.VoteRemove.Start', 'MusicLib.Track.VoteRemove.Participate',
        'MusicLib.Playlist.Create', 'MusicLib.Playlist.Delete',
        'Score.Set', 'Score.Add',
        'Bot.ReportBug',
        'Vote.Start']],
        [Role.KEY_ADMIN,   'Administrator',    'Users who administer the server, excluding the server owner.',
        ['Commands.Allowed', 
        'Music.Play', 'Music.Skip',
        'Music.SkipVote.Start', 'Music.SkipVote.Vote', 
        'MusicLib.Track.Download', 'MusicLib.Track.DownloadPlaylist', 'MusicLib.Track.Delete',
        'MusicLib.Track.VoteAdd.Start', 'MusicLib.Track.VoteAdd.Participate',
        'MusicLib.Track.VoteRemove.Start', 'MusicLib.Track.VoteRemove.Participate',
        'MusicLib.Playlist.Create', 'MusicLib.Playlist.Delete',
        'Score.Setup', 'Score.Set', 'Score.Add',
        'Reddit.Setup',
        'Bot.ReportBug',
        'Vote.Start']],
        [Role.KEY_OWNER,   'Owner',            'User who owns the server.',
        ['Commands.Allowed', 
        'Music.Play', 'Music.Skip',
        'Music.SkipVote.Start', 'Music.SkipVote.Vote', 
        'MusicLib.Track.Download', 'MusicLib.Track.DownloadPlaylist', 'MusicLib.Track.Delete',
        'MusicLib.Track.VoteAdd.Start', 'MusicLib.Track.VoteAdd.Participate',
        'MusicLib.Track.VoteRemove.Start', 'MusicLib.Track.VoteRemove.Participate',
        'MusicLib.Playlist.Create', 'MusicLib.Playlist.Delete',
        'Score.Setup', 'Score.Set', 'Score.Add',
        'Reddit.Setup',
        'Bot.ReportBug',
        'Vote.Start']]
    ];

    static initialize() {
        let log = PermissionInitializer.log;
        log('Checking Permissions...');

        async.each(PermissionInitializer.defaultPermissions, (permission:string[], callback) => {
            let permKey = permission[0];
            let permDesc = permission[1];

            Permission.findOrCreate({
                where: { id: permKey },
                defaults: { id: permKey, description: permDesc }
            }).spread((perm:Permission, created:boolean) => {
                if (created) {
                    log(`+ Permission created: ${permKey}`);
                } else {
                    log(`- Permission exists:  ${permKey}`);
                }
                callback();
            });
        }, function(err:Error) {
            log(`Permissions synchronized`);
            PermissionInitializer.initRoles();
        });
    }

    static initRoles(): void {
        let log = PermissionInitializer.log;
        log('Checking Roles...');

        async.each(PermissionInitializer.defaultRoles, (role:any, callback) => {
            let roleKey = role[0],
                roleName = role[1],
                roleDesc = role[2],
                rolePermissions = role[3];
            
            Role.findOrCreate({
                where: { id: roleKey },
                defaults: { id: roleKey, name: roleName, description: roleDesc }
            }).spread((roleObj:Role, created:boolean) => {
                if (created) {
                    log(`+ Role created: ${roleKey} (${roleName})`);
                    async.each(rolePermissions, (permission:string, roleCallback) => {
                        RolePermission.findOrCreate({
                            where: { roleID: roleKey, permID: permission },
                            defaults: { roleID: roleKey, permID: permission }
                        }).spread((rolePerm:RolePermission, created:boolean) => {
                            log(`- Connected Role and Permission: ${roleKey} <=> ${permission}`);
                            roleCallback();
                        });
                    }, (err:Error) => {
                        callback();
                    });
                } else {
                    log(`- Role exists:  ${roleKey} (${roleName})`);
                    roleObj.getPermissions()
                        .then((rolePerms:Permission[]) => {
                            const missingPermissions:string[] = [];
                            async.each(rolePermissions, (permission:string, roleCallback) => {
                                // If role does not have permission
                                if (rolePerms.filter(p => p.id === permission).length < 1) {
                                    missingPermissions.push(permission);
                                }
                                roleCallback();
                            }, (err:Error) => {
                                if (!err && missingPermissions.length > 0) {
                                    roleObj.addPermissions(missingPermissions)
                                        .then(() => {
                                            log(`+ Added ${missingPermissions.length} missing permissions for ${roleKey} (${roleName})`);
                                            callback();
                                        })
                                        .catch((err) => callback(err));
                                } else {
                                    callback();
                                }
                            });
                        })
                        .catch((err) => callback(err));
                }
            });
        }, (err:Error) => {
            log(`Roles synchronized`);
            PermissionCache.Instance.refresh();
        });
    }
}