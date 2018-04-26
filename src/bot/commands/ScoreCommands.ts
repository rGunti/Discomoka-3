import { BasePermissionCommand } from "../basecommands/BasePermissionCommand";
import { CommandoClient, CommandMessage } from 'discord.js-commando';
import { Message, Guild, User, Channel, TextChannel } from 'discord.js';
import { Score, ScoreSettings } from "../../db/model/Score";
import { getMessage, MessageLevel } from "../../utils/discord-utils";

export class ScoreSetupCommand extends BasePermissionCommand {
    constructor(client:CommandoClient) {
        super(client, {
            name: 'scoresetup',
            group: 'score',
            memberName: 'scoresetup',
            description: 'Sets up the score system on the current server.',
            guildOnly: true,
            args: [
                {
                    key: 'scoreChannel',
                    type: 'channel',
                    label: 'Score Channel',
                    prompt: 'Enter a channel you want to use to display the score history.'
                },
                {
                    key: 'scoreUnitName',
                    type: 'string',
                    label: 'Score Unit Name',
                    prompt: 'Enter a name for the score units.'
                }
            ],
            throttling: { usages: 1, duration: 10 }
        }, [
            'Commands.Allowed',
            'Score.Setup'
        ])
    }

    protected async runPermitted(msg:CommandMessage, args, fromPattern:boolean):Promise<Message|Message[]> {
        let self = this;
        let scoreChannel:Channel = args.scoreChannel;
        let scoreUnitName:string = args.scoreUnitName;

        if (scoreChannel.type !== "text") {
            return msg.reply(getMessage(
                MessageLevel.Error,
                'Invalid channel',
                'The given channel is not a text channel.'
            ));
        }

        let settings:ScoreSettings = await ScoreSetCommand.getScoreSettings(msg.guild);
        if (!settings) {
            settings = new ScoreSettings({
                serverID: msg.guild.id
            });
        }
        settings.scoreChannel = scoreChannel.id;
        settings.unitName = scoreUnitName;

        try {
            await settings.save();
            return msg.reply(getMessage(
                MessageLevel.Success,
                'Scoring system has been setup!',
                `You can now start giving people ${settings.unitName}.`
            ));
        } catch (err) {
            return msg.reply(getMessage(
                MessageLevel.Error,
                'Error while setting up score system',
                'Could not setup the scoring system.'
            ));
        }
    }
}

export class ScoreSetCommand extends BasePermissionCommand {
    constructor(client:CommandoClient) {
        super(client, {
            name: 'scoreset',
            group: 'score',
            memberName: 'scoreset',
            description: 'Sets the score of a given user (or yourself) to a given value.',
            guildOnly: true,
            args: [
                {
                    key: 'score',
                    type: 'integer',
                    label: 'Score',
                    prompt: 'Enter a value you want to set the score to:'
                },
                {
                    key: 'user',
                    type: 'user',
                    label: 'User',
                    prompt: 'Enter the user for whom you want to set the score.'
                },
                {
                    key: 'reason',
                    type: 'string',
                    label: 'Reason',
                    prompt: 'Enter a reason for why the user receives score.',
                    default: 'no reason'
                }
            ],
            throttling: { usages: 1, duration: 5 }
        }, [
            'Commands.Allowed',
            'Score.Set'
        ]);
    }

    protected async runPermitted(msg:CommandMessage, args, fromPattern:boolean):Promise<Message|Message[]> {
        let self = this;
        let { score, user, reason } = args;

        let currentScore = await ScoreSetCommand.getCurrentScore(msg.guild, msg.author);
        let scoreSettings:ScoreSettings;
        if (!currentScore) {
            scoreSettings = await ScoreSetCommand.getScoreSettings(msg.guild);
            currentScore = new Score({
                serverID: msg.guild.id,
                userID: msg.author.id
            });
        } else {
            scoreSettings = currentScore.scoreSettings;
        }
        currentScore.score = score;

        try {
            await currentScore.save();
            await (<TextChannel>msg.guild.channels.get(scoreSettings.scoreChannel)).send(
                `<@${user.id}>: Set to **${currentScore.score} ${scoreSettings.unitName}** by <@${msg.author.id}> for ${reason} (Balance: **${currentScore.score} ${scoreSettings.unitName}**)`
            );
            return msg.channel.send(getMessage(
                MessageLevel.Success,
                `Set ${scoreSettings.unitName} balance of _${user.username}_ to _${score}_.`
            ));
        } catch (err) {
            return msg.channel.send(getMessage(
                MessageLevel.Error,
                'Failed to set score',
                `Either you or an admin didn't setup the server for the scoring system or an internal error occured.`
            ));
        }
    }

    public static async getCurrentScore(guild:Guild, user:User):Promise<Score> {
        return Score.findOne({
            where: {
                serverID: guild.id,
                userID: user.id
            },
            include: [ScoreSettings]
        });
    }

    public static async getScoreSettings(guild:Guild):Promise<ScoreSettings> {
        return ScoreSettings.findOne({
            where: { serverID: guild.id }
        });
    }
}

export class ScoreGiveCommand extends BasePermissionCommand {
    constructor(client:CommandoClient) {
        super(client, {
            name: 'scoregive',
            group: 'score',
            memberName: 'scoregive',
            description: 'Gives a certain amount of score to a given user.',
            guildOnly: true,
            args: [
                {
                    key: 'score',
                    type: 'integer',
                    label: 'Score',
                    prompt: 'Enter a value you want to add to the score:'
                },
                {
                    key: 'user',
                    type: 'user',
                    label: 'User',
                    prompt: 'Enter the user for whom you want to set the score.'
                },
                {
                    key: 'reason',
                    type: 'string',
                    label: 'Reason',
                    prompt: 'Enter a reason for why the user receives score.',
                    default: 'no reason'
                }
            ],
            throttling: { usages: 1, duration: 5 }
        }, [
            'Commands.Allowed',
            'Score.Add'
        ])
    }

    protected async runPermitted(msg:CommandMessage, args, fromPattern:boolean):Promise<Message|Message[]> {
        let self = this;
        let { score, user, reason } = args;

        let currentScore = await ScoreSetCommand.getCurrentScore(msg.guild, msg.author);
        let scoreSettings:ScoreSettings;
        if (!currentScore) {
            scoreSettings = await ScoreSetCommand.getScoreSettings(msg.guild);
            currentScore = new Score({
                serverID: msg.guild.id,
                userID: msg.author.id
            });
        } else {
            scoreSettings = currentScore.scoreSettings;
        }
        currentScore.score = currentScore.score + score;

        try {
            await currentScore.save();
            await (<TextChannel>msg.guild.channels.get(scoreSettings.scoreChannel)).send(
                (score >= 0) ?
                `<@${user.id}>: **+${score} ${scoreSettings.unitName}** by <@${msg.author.id}> for ${reason} (Balance: **${currentScore.score} ${scoreSettings.unitName}**)` :
                `<@${user.id}>: **${score} ${scoreSettings.unitName}** by <@${msg.author.id}> for ${reason} (Balance: **${currentScore.score} ${scoreSettings.unitName}**)`
            );
            return msg.channel.send(getMessage(
                MessageLevel.Success,
                (score >= 0) ?
                `Given ${user.username} ${score} ${scoreSettings.unitName}, now has ${currentScore.score}.` :
                `Taken ${score * -1} ${scoreSettings.unitName} from ${user.username}, now has ${currentScore.score}.`
            ));
        } catch (err) {
            return msg.channel.send(getMessage(
                MessageLevel.Error,
                'Failed to give or take score',
                `Either you or an admin didn't setup the server for the scoring system or an internal error occured.`
            ));
        }
    }
}
