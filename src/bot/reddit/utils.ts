import * as getJSON from 'get-json';
import * as debug from 'debug';

const log:debug.IDebugger = debug('discomoka3:Reddit:Utils');

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

export async function subredditExists(subreddit:string):Promise<boolean> {
    let result = await promiseJson(`https://www.reddit.com/r/${subreddit}.json`);
    try {
        return (result.data.dist > 0);
    } catch (err) {
        return false;
    }
}
