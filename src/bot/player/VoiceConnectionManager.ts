import { VoiceConnection } from "discord.js";
import * as debug from "debug";

const log = debug(`discomoka3:VoiceConnectionManager`);

export class VoiceConnectionManager {
    private static connections:Map<string, VoiceConnection> = new Map<string, VoiceConnection>();

    public static addConnection(serverID:string, connection:VoiceConnection):void {
        log(`Adding connection for server ${serverID}`);
        VoiceConnectionManager.connections.set(serverID, connection);
    }

    public static getConnection(serverID:string):VoiceConnection {
        if (!VoiceConnectionManager.connections.has(serverID)) {
            log(`No connection available for server ${serverID}`);
            return null;
        } else {
            return VoiceConnectionManager.connections.get(serverID);
        }
    }

    public static removeConnection(serverID:string):void {
        log(`Removing connection for server ${serverID}`);
        VoiceConnectionManager.connections.delete(serverID);
    }
}