import { Command, CommandInfo, CommandoClient } from "discord.js-commando";

export abstract class OwnerCommand extends Command {
    constructor(client:CommandoClient, info:CommandInfo) {
        info.ownerOnly = true;
        super(client, info);
    }
}