import { BasePermissionCommand } from "../basecommands/BasePermissionCommand";
import { CommandoClient, CommandMessage } from 'discord.js-commando';
import { Message, MessageReaction, Collection, RichEmbed, GuildMember } from "discord.js";
import { getMessage, MessageLevel } from "../../utils/discord-utils";
import * as emoji from "node-emoji";
import * as moment from "moment";
import * as debug from "debug";
import * as async from "async";

export class StartVoteCommand extends BasePermissionCommand {
    static VOTE_YES = emoji.get('thumbsup');
    static VOTE_NO = emoji.get('thumbsdown');

    constructor(client:CommandoClient) {
        super(client, {
            name: 'startvote',
            group: 'voting',
            memberName: 'startvote',
            description: 'Starts a voting pool about a given topic.',
            guildOnly: true,
            args: [
                {
                    key: 'topic',
                    type: 'string',
                    label: 'Topic of your pool',
                    prompt: 'Enter the topic of your pool:'
                },
                {
                    key: 'duration',
                    type: 'time',
                    label: 'Duration of your pool',
                    prompt: 'Please enter how long your pool will stay open for votes:'
                }
            ],
            throttling: {
                usages: 1,
                duration: 30
            }
        }, [
            'Commands.Allowed',
            'Vote.Start'
        ]);
    }

    protected runPermitted(msg:CommandMessage, args, fromPattern:boolean):Promise<Message|Message[]> {
        let self = this;
        let { topic, duration } = args;

        return new Promise<Message|Message[]>((resolve, reject) => {
            msg.channel.send(
                self.getPoolMessage(msg.member, topic, moment(), duration)
            ).then(async (poolMessage:Message) => {
                let poolStarted = moment();

                // Pin pool so everyone can find it
                poolMessage.pin();

                // Add emojis to vote with
                await poolMessage.react(StartVoteCommand.VOTE_YES);
                await poolMessage.react(StartVoteCommand.VOTE_NO);

                // Resolve Promise
                resolve(poolMessage);

                // Store pool message
                poolMessage.awaitReactions(
                    (reaction:MessageReaction, user:any) => {
                        return (
                            reaction.emoji.name === StartVoteCommand.VOTE_YES ||
                            reaction.emoji.name === StartVoteCommand.VOTE_NO
                        );
                    },
                    { time: duration * 1000 }
                ).then((result:Collection<string, MessageReaction>) => {
                    let resultYes = result.has(StartVoteCommand.VOTE_YES)
                        ? result.get(StartVoteCommand.VOTE_YES).count - 1
                        : 0;
                    let resultNo = result.has(StartVoteCommand.VOTE_NO)
                        ? result.get(StartVoteCommand.VOTE_NO).count - 1
                        : 0;
                    
                    let resultMessage:RichEmbed = self.getPoolResultMessageContent(
                        msg.member, topic, resultYes, resultNo, poolStarted);
                    msg.channel.send(resultMessage);

                    // Unpin pool again
                    poolMessage.unpin();
                }).catch(self.log);
            });
        });
    }

    private getPoolMessage(member:GuildMember, topic:string, voteStarted:moment.Moment, voteDuration:number):RichEmbed {
        return new RichEmbed()
            .setAuthor(this.client.user.username, this.client.user.avatarURL)
            .setTitle('A voting pool has been started!')
            .setDescription(`<@${member.id}> has proposed the following topic and wants to ask for your opinion.`)
            .addBlankField()
            .addField('Topic', `\`\`\`${topic}\`\`\``)
            .addBlankField()
            .addField(`Vote ${StartVoteCommand.VOTE_YES}`, 'to accept this proposal.', true)
            .addField(`Vote ${StartVoteCommand.VOTE_NO}`, 'to decline this proposal.', true)
            .setFooter(
                `The vote has been started at ${voteStarted.format('YYYY-MM-DD HH:mm ZZ')} and will ` +
                `be concluded at ${voteStarted.add(voteDuration, 'seconds').format('YYYY-MM-DD HH:mm ZZ')}.`
            )
            .setColor(0xFAA61A)
        ;
    }

    private getPoolResultMessageContent(
        initiator:GuildMember,
        topic:string, votesYes:number, votesNo:number, voteStarted:moment.Moment
    ):RichEmbed {
        let params = this.getPoolResultMessage(votesYes, votesNo);
        let votesTotal = votesYes + votesNo;
        let votePercentageYes = (votesYes / votesTotal) * 100;
        let votePercentageNo = (votesNo / votesTotal) * 100;

        return new RichEmbed()
            .setAuthor(this.client.user.username, this.client.user.avatarURL)
            .setTitle('Voting results are in!')
            .setDescription('A voting pool has just closed and the results are in.')
            .addBlankField()
            .addField('Topic', `\`\`\`${topic}\`\`\``)
            .addField('Proposed by', `<@${initiator.id}>`)
            .addBlankField()
            .addField(`${emoji.get('1234')} Votes submitted: ${(votesYes + votesNo)}`, `100 %`, true)
            .addField(`${StartVoteCommand.VOTE_YES} Yea: ${votesYes}`, `${Number.isNaN(votePercentageYes) ? '-' : Math.round(votePercentageYes)} %`, true)
            .addField(`${StartVoteCommand.VOTE_NO} Nay: ${votesNo}`, `${Number.isNaN(votePercentageNo) ? '-' : Math.round(votePercentageNo)} %`, true)
            .addField(`${emoji.get('bar_chart')} Result of the vote`, params[0])
            .setFooter(
                `The vote has been started at ${voteStarted.format('YYYY-MM-DD HH:mm ZZ')} and ` +
                `has been ended at ${moment().format('YYYY-MM-DD HH:mm ZZ')}`
            )
            .setColor(params[1]);
    }

    private getPoolResultMessage(votesYes:number, votesNo:number):any[] {
        return [
            (votesYes > votesNo)
            ? `${emoji.get('white_check_mark')} The presented proposal has been **accepted**!`
            : (votesYes < votesNo
                ? `${emoji.get('x')} The presented proposal has been **declined**!`
                : `${emoji.get('grey_question')} The presented proposal has resulted in a **tie**!`),

            (votesYes > votesNo)
                ? 0x027F4F
                : (votesYes < votesNo ? 0xB53F4D : 0xCDC5B4)
        ];
    }
}
