import { Permission } from './../db/model/Permission';
import * as debug from 'debug';
import * as async from 'async';
import { Role } from '../db/model/Role';

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
        ["MusicLib.Playlist.Delete",                "Can delete a playlist on the server"]
    ];

    static defaultRoles = [
        [Role.KEY_GUEST,   'Guest',            'Users who are not (yet) active on the server. Usually @everyone.'],
        [Role.KEY_MEMBER,  'Member',           'Users who are active on the server.'],
        [Role.KEY_SUPPORT, 'Supporter',        'Users who help out Moderators perform mod tasks.'],
        [Role.KEY_MOD,     'Moderator',        'Users who moderate the server and keep everyone save.'],
        [Role.KEY_ADMIN,   'Administrator',    'Users who administer the server, excluding the server owner.'],
        [Role.KEY_OWNER,   'Owner',            'User who owns the server.']
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
        });

        async.each(PermissionInitializer.defaultRoles, (role:string[], callback) => {
            let roleKey = role[0],
                roleName = role[1],
                roleDesc = role[2];
            
            Role.findOrCreate({
                where: { id: roleKey },
                defaults: { id: roleKey, name: roleName, description: roleDesc }
            }).spread((role:Role, created:boolean) => {
                if (created) {
                    log(`+ Role created: ${roleKey} (${roleName})`);
                } else {
                    log(`- Role exists:  ${roleKey} (${roleName})`);
                }
                callback();
            });
        }, (err:Error) => {
            log(`Roles synchronized`);
        });
    }
}