import * as debug from 'debug';
import * as randomstring from 'randomstring';
import { Message, Guild, Channel, ClientUserGuildSettings, ClientUserSettings, Emoji, User, GuildMember, Collection, Snowflake, MessageReaction, Role, DMChannel, GroupDMChannel, TextChannel, GuildChannel, GuildMemberEditData } from 'discord.js';
import { CommandoClient, Command, CommandRegistry, CommandMessage, CommandGroup, ArgumentType, Argument, SQLiteProvider } from 'discord.js-commando';
import { join } from 'path';
import { RateLimitInfo } from './../utils/additionalTypings';
import { existsSync } from 'fs';
import * as config from 'config';
import * as sqlite from 'sqlite';
import * as pjson from 'pjson';
import { TimespanArgument, DateTimeArgument } from './types';
import { RedditFetcherStock } from './reddit/fetcher';

export class DiscordBot {
    protected instanceID:string;
    protected debugLog:debug.IDebugger;
    protected eventLog:debug.IDebugger;
    protected messageLog:debug.IDebugger;
    protected errorLog:debug.IDebugger;
    
    protected client:CommandoClient;

    constructor() {
        this.instanceID = randomstring.generate(16);
        this.initializeLogging(this.instanceID);
        this.initializeClient();
    }

    protected initializeLogging(instanceID:string):void {
        this.debugLog = debug(`discomoka3:Bot ${instanceID}:Debug`);
        this.eventLog = debug(`discomoka3:Bot ${instanceID}:Event`);
        this.messageLog = debug(`discomoka3:Bot ${instanceID}:Message`);
        this.errorLog = debug(`discomoka3:Bot ${instanceID}:Error`);

        this.debugLog(`Initialized Discord Bot`);
    }

    protected initializeClient():void {
        let self = this;
        this.debugLog('Initializing CommandoClient...')
        let client = new CommandoClient({
            commandPrefix: config.get('discord.defaultCommandPrefix'),
            owner: config.get('discord.botOwner')
        });

        // Register Events
        // - Client Events
        // -- COM
        client.on('debug', (info:string) => { self.onDebug(info) });
        client.on('error', (error:Error) => { self.onError(error) });
        client.on('warn', (info:string) => { self.onWarning(info) });

        // -- Connection
        client.on('ready', () => { self.onReady() });
        client.on('disconnect', (event:CloseEvent) => { self.onDisconnect(event) });
        client.on('reconnecting', () => { self.onReconnecting() });
        client.on('resumed', (replayed:number) => { self.onResume(replayed) });

        // -- Channels
        //client.on('channelCreate', (channel:DMChannel | GroupDMChannel | GuildChannel) => { self.onChannelCreate(channel) });
        //client.on('channelDelete', (channel:GroupDMChannel | GuildChannel) => { self.onChannelDelete(channel) });
        //client.on('channelPinsUpdate', (channel:DMChannel | GroupDMChannel | TextChannel, time:Date) => { self.onChannelPinsUpdate(channel, time) });
        //client.on('channelUpdate', (oldChannel:DMChannel | GroupDMChannel | TextChannel, newChannel:DMChannel | GroupDMChannel | TextChannel) => { self.onChannelUpdate(oldChannel, newChannel) });

        // -- Client User (Guild) Settings
        //client.on('clientUserGuildSettingsUpdate', (clientUserGuildSettings:ClientUserGuildSettings) => { self.onClientUserGuildSettingsUpdate(clientUserGuildSettings) });
        //client.on('clientUserSettingsUpdate', (clientUserSettings:ClientUserSettings) => { self.onClientUserSettingsUpdate(clientUserSettings) });

        // -- Emojis
        //client.on('emojiCreate', (emoji:Emoji) => { self.onEmojiCreate(emoji) });
        //client.on('emojiDelete', (emoji:Emoji) => { self.onEmojiDelete(emoji) });
        //client.on('emojiUpdate', (oldEmoji:Emoji, newEmoji:Emoji) => { self.onEmojiUpdate(oldEmoji, newEmoji) });
        
        // -- Guilds
        //client.on('guildCreate', (guild:Guild) => { self.onGuildCreate(guild) });
        //client.on('guildDelete', (guild:Guild) => { self.onGuildDelete(guild) });
        //client.on('guildUnavailable', (guild:Guild) => { self.onGuildUnavailable(guild) });
        //client.on('guildUpdate', (oldGuild:Guild, newGuild:Guild) => { self.onGuildUpdate(oldGuild, newGuild) });

        // -- Guild Bans
        //client.on('guildBanAdd', (guild:Guild, user:User) => { self.onGuildBanAdd(guild, user) });
        //client.on('guildBanRemove', (guild:Guild, user:User) => { self.onGuildBanRemove(guild, user) });
        
        // -- Guild Members
        //client.on('guildMemberAdd', (member:GuildMember) => { self.onGuildMemberAdd(member) });
        //client.on('guildMemberAvailable', (member:GuildMember) => { self.onGuildMemberAvailable(member) });
        //client.on('guildMemberRemove', (member:GuildMember) => { self.onGuildMemberRemove(member) });
        //client.on('guildMembersChunk', (members:Collection<string, GuildMember>, guild:Guild) => { self.onGuildMembersChunk(members, guild) });
        //client.on('guildMemberSpeaking', (member:GuildMember, speaking:boolean) => { self.onGuildMemberSpeaking(member, speaking) });
        //client.on('guildMemberUpdate', (oldMember:GuildMember, newMember:GuildMember) => { self.onGuildMemberUpdate(oldMember, newMember) });

        // -- Messages
        //client.on('message', (message:Message) => { self.onMessageReceived(message) });
        //client.on('messageDelete', (message:Message) => { self.onMessageDelete(message) });
        //client.on('messageDeleteBulk', (messages:Collection<Snowflake, Message>) => { self.onMessageDeleteBulk(messages) });
        //client.on('messageUpdate', (oldMessage:Message, newMessage:Message) => { self.onMessageUpdate(oldMessage, newMessage) });

        // -- Message Reactions
        //client.on('messageReacitonAdd', (reaction:MessageReaction, user:User) => { self.onMessageReactionAdd(reaction, user) });
        //client.on('messageReactionRemove', (reaction:MessageReaction, user:User) => { self.onMessageReactionRemove(reaction, user) });
        //client.on('messageReactionRemoveAll', (message:Message) => { self.onMessageReactionRemoveAll(message) });

        // -- Presence
        //client.on('presenceUpdate', (oldMemeber:GuildMember, newMember:GuildMember) => { self.onPresenceUpdate(oldMemeber, newMember) });
        
        // -- Rate Limit
        client.on('rateLimit', (rateLimit:RateLimitInfo) => { self.onRateLimit(rateLimit) });

        // -- Roles
        //client.on('roleCreate', (role:Role) => { self.onRoleCreate(role) });
        //client.on('roleDelete', (role:Role) => { self.onRoleDelete(role) });
        //client.on('roleUpdate', (oldRole:Role, newRole:Role) => { self.onRoleUpdate(oldRole, newRole) });

        // -- Typing
        //client.on('typingStart', (channel:Channel, user:User) => { self.onTypingStart(channel, user) });
        //client.on('typingStop', (channel:Channel, user:User) => { self.onTypingStop(channel, user) });
        
        // -- Users
        //client.on('userNoteUpdate', (user:User, oldNote:string, newNote:string) => { self.onUserNoteUpdate(user, oldNote, newNote) });
        //client.on('userUpdate', (oldUser:User, newUser:User) => { self.onUserUpdate(oldUser, newUser) });
    
        // -- Voice
        //client.on('voiceStateUpdate', (oldMember:GuildMember, newMember:GuildMember) => {});

        // - Commando Events
        client.on('commandBlocked', (message:CommandMessage, reason:string) => { self.onCommandBlocked(message, reason) });
        client.on('commandError', (command:Command, err:Error, message:CommandMessage, args:string|{}|string[], fromPattern:boolean) => { self.onCommandError(command, err, message, args, fromPattern) });
        client.on('commandPrefixChange', (guild:Guild, prefix:string) => { self.onCommandPrefixChange(guild, prefix) });
        client.on('commandRegister', (command:Command, registry:CommandRegistry) => { self.onCommandRegister(command, registry) });
        client.on('commandReregister', (newCommand:Command, oldCommand:Command) => { self.onCommandReregistered(oldCommand, newCommand) });
        client.on('commandRun', (command:Command, promise:Promise<any>, message:CommandMessage, args:Object | string | string[], fromPattern:boolean) => { self.onCommandRun(command, promise, message, args, fromPattern) })
        client.on('commandStatusChange', (guild:Guild, command:Command, enabled:boolean) => { self.onCommandStatusChange(guild, command, enabled) });
        client.on('commandUnregister', (command:Command) => { self.onCommandUnregister(command) });
        
        client.on('groupRegister', (group:CommandGroup, registry:CommandRegistry) => { self.onGroupRegister(group, registry) });
        client.on('groupStatusChange', (guild:Guild, group:CommandGroup, enabled:boolean) => { self.onGroupStatusChange(guild, group, enabled) });
        
        client.on('typeRegister', (type:ArgumentType, registry:CommandRegistry) => { self.onTypeRegister(type, registry) });
        client.on('unknownCommand', (message:CommandMessage) => { self.onUnknownCommand(message) });

        // Register Commands
        client.registry
        .registerDefaultTypes()
        .registerDefaultGroups()
        .registerDefaultCommands({
            prefix: false
        })
        .registerGroups([
            ['debug', 'Debug Commands'],
            ['develop', 'Developer-helping Commands'],
            ['admin', 'Admin / Mod Commands'],
            ['music', 'Music Commands'],
            ['owner', 'Commands for the MASTER'],
            ['reddit', 'Reddit Post Puller Commands'],
            ['setup', 'Setup Commands [for Admins only]'],
            ['score', 'Scoring system Commands'],
            ['voting', 'Commands for Democracy']
        ])
        .registerTypes([
            TimespanArgument,
            DateTimeArgument
        ]);

        let commandDirectory = join(__dirname, 'commands');
        if (existsSync(commandDirectory)) {
            client.registry.registerCommandsIn(commandDirectory);
        } else {
            this.errorLog(`Command Directory ${commandDirectory} does not exist. Are commands built?`);
        }

        // TODO: Migrate to MySQL
        client.setProvider(
            sqlite.open(config.get('discord.settingsStorage'))
                .then(db => new SQLiteProvider(db))
        ).catch(console.error);

        this.client = client;
    }

    public start(token:string) {
        this.debugLog(`Logging in ...`);
        this.client.login(token);
    }

    // *** Client Events ***
    // --- COM ---
    protected onDebug(info:string) {
        this.debugLog(info);
    }

    protected onError(error:Error) {
        this.errorLog(`${error.name} ${error.message}\n${error.stack}`);
    }

    protected onWarning(info:string) {
        this.eventLog(`WARNING: ${info}`);
    }

    // --- Connection ---
    protected onReady() {
        this.eventLog(`Connected and ready!`);
        this.client.user.setActivity(`Ver. ${pjson.version}`);

        RedditFetcherStock.initialize(this.client);
    }

    protected onDisconnect(event:CloseEvent) {
        this.eventLog(`Disconnected! Reason: ${event.reason}`);
    }

    protected onReconnecting() {
        this.eventLog(`Trying to reconnect ...`);
    }

    protected onResume(replayed:number) {
        this.eventLog(`Socket resumed, replayed ${replayed} event(s)`);
    }

    // --- Channels ---
    protected onChannelCreate(channel:DMChannel | GroupDMChannel | GuildChannel) {
        this.eventLog(`Channel created: ${channel.id} (${channel.type})`);
    }

    protected onChannelDelete(channel:GroupDMChannel | GuildChannel) {
        this.eventLog(`Channel deleted: ${channel.id} (${channel.type})`);
    }

    protected onChannelPinsUpdate(channel:DMChannel | GroupDMChannel | TextChannel, time:Date) {
        this.eventLog(`Channel Pins updated on ${channel.id} (${channel.type})`);
    }

    protected onChannelUpdate(oldChannel: DMChannel | GroupDMChannel | TextChannel, newChannel: DMChannel | GroupDMChannel | TextChannel) {
        this.eventLog(`Channel updated: ${oldChannel.id} (${oldChannel.id})`);
    }

    // --- Client User (Guild) Settings ---
    protected onClientUserGuildSettingsUpdate(clientUserGuildSettings:ClientUserGuildSettings) {
        this.eventLog(`Client User Guild Settings updated`);
    }

    protected onClientUserSettingsUpdate(clientUserSettings:ClientUserSettings) {
        this.eventLog(`Client User Settings updated`);
    }

    // --- Emojis ---
    protected onEmojiCreate(emoji:Emoji) {
        this.eventLog(`Emoji "${emoji.name}" created on ${emoji.guild.name}`);
    }

    protected onEmojiDelete(emoji:Emoji) {
        this.eventLog(`Emoji "${emoji.name}" deleted on ${emoji.guild.name}`);
    }

    protected onEmojiUpdate(oldEmoji:Emoji, newEmoji:Emoji) {
        this.eventLog(`Emoji "${oldEmoji.name}" updated to "${newEmoji.name}" on ${oldEmoji.guild.name}`);
    }

    // --- Guilds ---
    protected onGuildCreate(guild:Guild) {
        this.eventLog(`Joined server "${guild.name}"`);
    }
    
    protected onGuildDelete(guild:Guild) {
        this.eventLog(`Left server "${guild.name}"`);
    }

    protected onGuildUnavailable(guild:Guild) {
        this.eventLog(`Server unavailable: "${guild.name}"`);
    }

    protected onGuildUpdate(oldGuild:Guild, newGuild:Guild) {
        this.eventLog(`Guild "${oldGuild.name}" updated to "${newGuild.name}"`);
    }

    // --- Guild Bans ---
    protected onGuildBanAdd(guild:Guild, user:User) {
        this.eventLog(`Banned User "${user.tag}" from "${guild.name}"`);
    }

    protected onGuildBanRemove(guild:Guild, user:User) {
        this.eventLog(`Unbanned User "${user.tag}" from "${guild.name}"`);
    }

    // --- Guild Members ---
    protected onGuildMemberAdd(member:GuildMember) {
        this.eventLog(`Member "${member.user.tag}" joined "${member.guild.name}"`);
    }

    protected onGuildMemberAvailable(member:GuildMember) {
        this.eventLog(`Member "${member.user.tag}@${member.guild.name}" is available`);
    }

    protected onGuildMemberRemove(member:GuildMember) {
        this.eventLog(`Member "${member.user.tag}" has left "${member.guild.name}"`);
    }

    protected onGuildMembersChunk(members:Collection<Snowflake, GuildMember>, guild:Guild) {
        this.eventLog(`Received Guild Member chunk from "${guild.name}"`);
    }

    protected onGuildMemberSpeaking(member:GuildMember, speaking:boolean) {
        this.eventLog(`Member "${member.user.tag}@${member.guild.name}" ${speaking ? 'started' : 'stopped'} speaking`);
    }

    protected onGuildMemberUpdate(oldMember:GuildMember, newMember:GuildMember) {
        this.eventLog(`Member "${oldMember.user.tag}@${oldMember.guild.name}" was updated to "${newMember.user.tag}@${newMember.guild.name}"`);
    }

    // --- Messages ---
    protected onMessageReceived(message:Message) {
        this.eventLog(`Received message from "${message.author.tag}@(${message.channel.type})${message.channel.id}@${message.guild ? message.guild.name : '-'}"`);
        this.messageLog(`${message.author.tag}@(${message.channel.type})${message.channel.id}@${message.guild ? message.guild.name : '-'} : ${message}`);
    }

    protected onMessageDelete(message:Message) {
        this.eventLog(`Message ${message.id} deleted from "${message.author.tag}@(${message.channel.type})${message.channel.id}@${message.guild ? message.guild.name : '-'}"`);
    }

    protected onMessageDeleteBulk(messages:Collection<Snowflake, Message>) {
        this.eventLog(`Bulk-deleted messages`);
    }

    protected onMessageUpdate(oldMessage:Message, newMessage:Message) {
        this.eventLog(`Message updated from "${oldMessage.author.tag}@(${oldMessage.channel.type})${oldMessage.channel.id}@${oldMessage.guild ? oldMessage.guild.name : '-'}"`);
    }

    // --- Message Reactions ---
    protected onMessageReactionAdd(reaction:MessageReaction, user:User) {
        this.eventLog(`${user.tag} added Reaction "${reaction.emoji}" to "${reaction.message.id}"`);
    }

    protected onMessageReactionRemove(reaction:MessageReaction, user:User) {
        this.eventLog(`${user.tag} removed Reaction "${reaction.emoji}" to "${reaction.message.id}"`);
    }

    protected onMessageReactionRemoveAll(message:Message) {
        this.eventLog(`Removed all Reactions from "${message.id}"`);
    }

    // --- Presence ---
    protected onPresenceUpdate(oldMember:GuildMember, newMember:GuildMember) {
        this.eventLog(`"${oldMember.user.tag}@${oldMember.guild.name}" updated presence from "${oldMember.presence.status}" to "${newMember.presence.status}"`);
    }

    // --- Rate Limit ---
    protected onRateLimit(rateLimit:RateLimitInfo) {
        this.errorLog(`HIT RATE LIMIT! Received timeout for ${rateLimit.timeout} ms!`);
    }

    // --- Roles ---
    protected onRoleCreate(role:Role) {
        this.eventLog(`Created role "${role.name}@${role.guild.name}"`);
    }

    protected onRoleDelete(role:Role) {
        this.eventLog(`Deleted role "${role.name}@${role.guild.name}"`);
    }

    protected onRoleUpdate(oldRole:Role, newRole:Role) {
        this.eventLog(`Updated role "${oldRole.name}@${oldRole.guild.name}" to "${newRole.name}@${newRole.guild.name}"`);
    }

    // --- Typing ---
    protected onTypingStart(channel:Channel, user:User) {
        this.eventLog(`"${user.tag}@(${channel.type})${channel.id}" started typing`);
    }
    
    protected onTypingStop(channel:Channel, user:User) {
        this.eventLog(`"${user.tag}@(${channel.type})${channel.id}" stopped typing`);
    }

    // --- Users ---
    protected onUserNoteUpdate(user:User, oldNote:string, newNote:string) {
        this.eventLog(`Updated user note of ${user.tag}`);
    }

    protected onUserUpdate(oldUser:User, newUser:User) {
        this.eventLog(`Updated user "${oldUser.tag}" to "${newUser.tag}"`);
    }

    // --- Voice ---
    protected onVoiceStateUpdate(oldMember:GuildMember, newMember:GuildMember) {
        this.eventLog(`Voice State updated for "${oldMember.user.tag}@${oldMember.guild.name}"`);
    }

    // *** Commando Events ***
    protected onCommandBlocked(message:CommandMessage, reason:string) {
        this.eventLog(`Command blocked: ${message.author.tag}@(${message.channel.type})${message.channel.id} : ${message}\nReason: ${reason}`);
    }

    protected onCommandError(command:Command, err:Error, message:CommandMessage, args:string|{}|string[], fromPattern:boolean) {
        this.eventLog(`Error on Command ${command.name}! Message was: ${message.author.tag}@(${message.channel.type})${message.channel.id} : ${message.content}`);
    }

    protected onCommandPrefixChange(guild:Guild, prefix:string) {
        this.eventLog(`Command prefix changed on ${guild.name} to "${prefix}"`);
    }

    protected onCommandRegister(command:Command, registry:CommandRegistry) {
        this.eventLog(`Registered command ${command.name}`);
    }

    protected onCommandReregistered(oldCommand:Command, newCommand:Command) {
        this.eventLog(`Reregistered command ${newCommand.name} (before: ${oldCommand.name})`);
    }

    protected onCommandRun(command:Command, promise:Promise<any>, message:CommandMessage, args:Object | string | string[], fromPattern:boolean) {
        this.eventLog(`Command ${command.name} run`);
    }

    protected onCommandStatusChange(guild:Guild, command:Command, enabled:boolean) {
        this.eventLog(`Status of Command ${command.name} changed to ${enabled} on ${guild ? guild.name : '<GLOBAL>'}`);
    }

    protected onCommandUnregister(command:Command) {
        this.eventLog(`Command ${command.name} unregistered`);
    }

    protected onGroupRegister(group:CommandGroup, registry:CommandRegistry) {
        this.eventLog(`Group ${group.name} registered`);
    }

    protected onGroupStatusChange(guild:Guild, group:CommandGroup, enabled:boolean) {
        this.eventLog(`Status of Group ${group.name} changed to ${enabled} on ${guild ? guild.name : '<GLOBAL>'}`);
    }

    protected onTypeRegister(type:ArgumentType, registry:CommandRegistry) {
        this.eventLog(`Argument Type ${type.id} registered`);
    }

    protected onUnknownCommand(message:CommandMessage) {
        this.eventLog(`Requested unknown command: [${message.author.tag}@(${message.channel.type})${message.channel.id}] ${message.content}`);
    }
}