import * as getJSON from 'get-json';
import * as debug from 'debug';

const log:debug.IDebugger = debug('discomoka3:Reddit:Utils');

export interface SubredditListings {
    kind:string;
    data:{
        modhash:string,
        dist:number,
        children:RedditThing[]
    };
}
export interface RedditThing {
    kind:RedditThing;
    data:RedditPost|any;
}

export interface RedditPost {
    title:string;
    name:string;
    spoiler:boolean;
    url:string;
    permalink:string;
    domain:string;
    subreddit:string;
    subreddit_id:string;
    selftext:string;
    selftext_html:string;
    author:string;
    over_18:boolean;
    created:Date;
    created_utc:Date;
    stickied:boolean;
    ups:number;
    downs:number;
}

export enum RedditThingType {
    Comment = "t1",
    Account = "t2",
    Link = "t3",
    Message = "t4",
    Subreddit = "t5",
    Award = "t6"
}

export function promiseJson(url:string):Promise<any> {
    return new Promise<any>((resolve, reject) => {
        log(`Requesting ${url} ...`);
        getJSON(url, (err:Error|any, response:any) => {
            if (err) {
                reject(err);
            } else {
                resolve(response);
            }
        })
    });
}

export async function fetchSubreddit(subreddit:string):Promise<SubredditListings> {
    return await promiseJson(`https://www.reddit.com/r/${subreddit}.json`);
}

export async function subredditExists(subreddit:string):Promise<boolean> {
    let result = await fetchSubreddit(subreddit);
    try {
        return (result.data.dist > 0);
    } catch (err) {
        return false;
    }
}
