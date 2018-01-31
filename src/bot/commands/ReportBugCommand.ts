import { BasePermissionCommand } from "../basecommands/BasePermissionCommand";
import { CommandoClient, CommandMessage } from 'discord.js-commando';
import { Message } from 'discord.js';
import * as Github from "@octokit/rest";
import * as config from "config";
import { autoResolveMessage, getMessage, MessageLevel } from "../../utils/discord-utils";
import * as moment from "moment";

export class ReportBugCommand extends BasePermissionCommand {
    private githubClient:Github;
    private repoOwner:string;
    private repoName:string;
    private issueTag:string;

    constructor(client:CommandoClient) {
        super(client, {
            name: 'bugreport',
            group: 'develop',
            memberName: 'bugreport',
            description: 'Reports a bug to the Bots GitHub issue board.',
            guildOnly: true,
            args: [
                {
                    key: 'title',
                    type: 'string',
                    label: 'Bug Report Title',
                    prompt: 'Enter a title for your bug report (like a short error description):'
                },
                {
                    key: 'description',
                    type: 'string',
                    label: 'Report Text',
                    prompt: 'Enter a text that you want to use to describe the problem.'
                }
            ],
            throttling: {
                usages: 1,
                duration: 30
            }
        }, [
            'Commands.Allowed'
            // TODO: Add Permission for that
        ]);

        this.githubClient = new Github();
        this.githubClient.authenticate({
            type: 'token',
            token: config.get('github.personalAccessToken')
        });

        this.repoOwner = config.get('github.repositoryOwner');
        this.repoName = config.get('github.repositoryName');
        this.issueTag = config.get('github.issueTag');
    }

    protected runPermitted(msg:CommandMessage, args, fromPattern:boolean):Promise<Message|Message[]> {
        let self = this;
        let { title, description } = args;

        description += "\n\n---\n\nThis issue has been reported over Discord by the following user:\n";
        description += `**User**: \`${msg.author.tag}\`\n`;
        description += `**Server**: ${msg.guild.name} [\`${msg.guild.id}\`]\n`;
        description += `**Server Owner**: \`${msg.guild.owner.user.tag}\`\n`;
        description += `**Reported at**: ${moment().format('YYYY-MM-DD HH:mm:ss ZZ')}`;

        return new Promise<Message|Message[]>((resolve, reject) => {
            this.githubClient.issues.create({
                owner: this.repoOwner,
                repo: this.repoName,
                title: title,
                body: description,
                labels: [ this.issueTag ]
            }).then((value:Github.AnyResponse) => {
                let message = getMessage(
                    MessageLevel.Success,
                    "Bug reported",
                    "Thank you for reporting this problem! Have a :cookie:.\n" + 
                    "If you want to track the progress on this problem, check out the following link: " + 
                    value.data.html_url
                );
                msg.reply(message).then(resolve).catch(reject);
            }).catch((reason:any) => {
                let message = getMessage(
                    MessageLevel.Error,
                    "Report failed",
                    "Something went terribly from when sending your bug report (_how ironic..._).\n" + 
                    "If this happens again, please report your problem manually using the following link: " + 
                    `https://github.com/${self.repoOwner}/${self.repoName}/issues`
                );
                msg.reply(message).then(resolve).catch(reject);
            });
        });
    }
}