import { Message, TextChannel, RichEmbed, GuildMember, MessageReaction, Collection } from 'discord.js';
import * as emoji from "node-emoji";
import * as debug from "debug";
import * as moment from "moment";
import { EventEmitter } from 'events';

const log = debug("discomoka3:Pool");

export declare interface Pool {
    // Example event description
    on(event: 'pool_opened', listener: (pool:Pool) => void): this;
    on(event: 'pool_closed', listener: (pool:Pool, votes:VoteOptionSummary[], winners:VoteOptionSummary[]) => void): this;

    // Default event description
    on(event: string, listener: Function): this;
}

export class Pool extends EventEmitter {
    public static EMOJI_VOTE_YES:string = emoji.get('thumbsup');
    public static EMOJI_VOTE_NO:string = emoji.get('thumbsdown');
    public static VOTE_EMOJIS:string[] = [
        Pool.EMOJI_VOTE_YES,
        Pool.EMOJI_VOTE_NO
    ];

    protected topic:string;
    protected duration:number;
    protected startedBy:GuildMember;
    
    protected voteStarted:moment.Moment;

    protected poolMessage:Message;

    constructor(startedBy:GuildMember, topic:string, duration:number) {
        super();
        this.startedBy = startedBy;
        this.topic = topic;
        this.duration = duration;
    }

    public get Topic():string { return this.topic; }
    public get Duration():number { return this.duration; }
    public get DurationInMS():number { return this.duration * 1000; }
    public get StartedBy():GuildMember { return this.startedBy; }

    public startPool(channel:TextChannel):void {
        let self = this;
        this.voteStarted = moment.utc();
        channel.send(this.toDiscordMessage())
            .then(async (message:Message) => {
                self.onPoolOpened(message);
            });
    }

    protected toDiscordMessage():RichEmbed {
        return new RichEmbed()
            .setAuthor(this.startedBy.client.user.username, this.startedBy.client.user.avatarURL)
            .setTitle('A voting pool has been started!')
            .setDescription(`<@${this.startedBy.id}> has proposed the following topic and wants to ask for your opinion.`)
            .addBlankField()
            .addField('Topic', `${this.topic}`)
            .addBlankField()
            .addField(`Vote ${Pool.EMOJI_VOTE_YES}`, 'to accept this proposal.', true)
            .addField(`Vote ${Pool.EMOJI_VOTE_NO}`, 'to decline this proposal.', true)
            .setFooter(
                `The vote has been started at ${this.voteStarted.format('YYYY-MM-DD HH:mm ZZ')} and will ` +
                `be concluded at ${this.voteStarted.add(this.duration, 'seconds').format('YYYY-MM-DD HH:mm ZZ')}.`
            )
            .setColor(0xFAA61A);
    }

    protected winnerResultToDiscordMessage(votes:VoteOptionSummary[], winners:VoteOptionSummary[]):RichEmbed {
        let votesYes = votes.find(v => v.Option == Pool.EMOJI_VOTE_YES),
            votesNo = votes.find(v => v.Option == Pool.EMOJI_VOTE_NO);
        let votesSum = votes.map(v => v.Votes).reduce((p, c, i, a) => p + c, 0);
        let percentageYes = ((votesYes ? votesYes.Votes : 0) / votesSum) * 100,
            percentageNo = ((votesNo ? votesNo.Votes : 0) / votesSum) * 100;
        let messageColor = (winners.length === 1 && winners[0].Votes > 0) ? 
            (winners[0].Option === Pool.EMOJI_VOTE_YES ? 0x027F4F : 0xB53F4D) :
            0xCDC5B4;
        let messageText = (winners.length === 1 && winners[0].Votes > 0) ?
            (winners[0].Option === Pool.EMOJI_VOTE_YES ? 
                `${emoji.get('white_check_mark')} The presented proposal has been **accepted**!` :
                `${emoji.get('x')} The presented proposal has been **declined**!`
            ) : `${emoji.get('grey_question')} The presented proposal has resulted in a **tie**!`;

        return new RichEmbed()
            .setAuthor(this.startedBy.client.user.username, this.startedBy.client.user.avatarURL)
            .setTitle('Voting results are in!')
            .setDescription('A voting pool has just closed and the results are in.')
            .addBlankField()
            .addField('Topic', this.Topic)
            .addField('Proposed by', `<@${this.StartedBy.id}>`)
            .addBlankField()
            .addField(`${emoji.get('1234')} Votes submitted: ${votesSum}`, `100 %`)
            .addField(`${Pool.EMOJI_VOTE_YES} Yea: ${(votesYes ? votesYes.Votes : 0)}`, `${Number.isNaN(percentageYes) ? '-' : Math.round(percentageYes)} %`, true)
            .addField(`${Pool.EMOJI_VOTE_NO} Nay: ${(votesNo ? votesNo.Votes : 0)}`, `${Number.isNaN(percentageNo) ? '-' : Math.round(percentageNo)} %`, true)
            .addBlankField()
            .addField(`${emoji.get('bar_chart')} Result of the vote`, messageText)
            .setFooter(
                `The vote has been started at ${this.voteStarted.format('YYYY-MM-DD HH:mm ZZ')} and ` +
                `has been ended at ${moment.utc().format('YYYY-MM-DD HH:mm ZZ')}`
            )
            .setColor(messageColor);
    }

    protected async onPoolOpened(message:Message):Promise<void> {
        let self = this;
        this.poolMessage = message;

        // Pin Message
        message.pin().catch(log);

        // Add emojis to vote with
        await this.initVoteOptions();

        this.poolMessage.awaitReactions(
            (reaction:MessageReaction, user:any) => Pool.VOTE_EMOJIS.indexOf(reaction.emoji.name) > -1,
            { time: this.DurationInMS }
        ).then((reactions:Collection<string, MessageReaction>) => {
            self.onPoolClosed(reactions);
        }).catch(log);
        this.emit('pool_opened', this);
    }

    protected async onPoolClosed(reactions:Collection<string, MessageReaction>):Promise<void> {
        this.poolMessage.unpin().catch(log);

        let votes = reactions.map((value:MessageReaction, key:string) => {
            return new VoteOptionSummary(key, value.count - 1)
        });
        let winners = this.determinWinningOptions(votes);
        await this.poolMessage.channel.send(this.winnerResultToDiscordMessage(votes, winners));
        this.emit('pool_closed', this, votes, winners);
    }

    protected getVotesForOption(reactions:Collection<string, MessageReaction>, option:string):number {
        return reactions.has(option) ? (reactions.get(option).count - 1) : 0;
    }

    protected async initVoteOptions():Promise<void> {
        for (let option of Pool.VOTE_EMOJIS) {
            await this.poolMessage.react(option);
        }
    }

    protected determinWinningOptions(votes:VoteOptionSummary[]):VoteOptionSummary[] {
        // Returns the VoteOptions with the highest number of votes
        return votes.filter(v => v.Votes == Math.max(...votes.map(v => v.Votes)));
    }
}

export class VoteOptionSummary {
    private option:string;
    private votes:number;

    constructor(option:string, votes:number) {
        this.option = option;
        this.votes = votes;
    }

    public get Option():string { return this.option; }
    public get Votes():number { return this.votes; }
}