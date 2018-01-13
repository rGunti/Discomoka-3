import { Permission } from './../db/model/Permission';
import * as debug from 'debug';
import * as async from 'async';

export class PermissionInitializer {
    static log:debug.IDebugger = debug(`discomoka3:Permissions:Initializer`);
    static defaultPermissions = [
        // Generic Permissions
        ["Commands.Enabled", "When enabled a user with this permission is allowed to run commands. This permission is needed to execute any command on a server."],
        // Music Playback
        ["Music.Play", "Can start / stop playback"],
        ["Music.Skip", "Can skip the currently playing song"],
        ["Music.SkipVote.Start", "Can start a skip-vote for the currently playing track"],
        ["Music.SkipVote.Vote", "Can vote to skip a track"],
        // Music Library Management
        ["MusicLib.Track.Download", "Can add a track to the servers music library"],
        ["MusicLib.Track.DownloadPlaylist", "Can add a playlist to the servers music library (e.g. a YouTube playlist)"],
        ["MusicLib.Track.Delete", "Can delete a track from the servers music library"],
        ["MusicLib.Playlist.Create", "Can create (and manage) a playlist on the servers music library"],
        ["MusicLib.Playlist.Delete", "Can delete a playlist on the server"]
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
    }
}