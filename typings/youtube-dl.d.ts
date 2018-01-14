// Type definitions for youtube-dl 1.12
// Project: https://www.npmjs.com/package/youtube-dl
// Definitions by: Raphael "rGunti" Guntersweiler <https://github.com/rgunti>
// Definitions: ???
// TypeScript Version: 2.6.2

/// <reference types="node" />
import * as fs from "fs";

export = youtubedl;
declare function youtubedl(url: string, arg: string[], opt: {[key: string]: string}): youtubedl.Youtubedl;
declare namespace youtubedl {
    function getInfo(url:string, opt:{[key:string]: string}, callback:(err:Error, info:MediaInfo) => void);
    function exec(url:string, arg:string[], opt:{[key:string]: string}, callback:(err:Error, output:string[]) => void);

    interface Youtubedl {
        on(event: string, func: (info: Info) => void): this;
        pipe(stream: fs.WriteStream): this;
    }
    interface Info {
        _filename: string;
        filename: string;
        size: number;
    }
    interface MediaInfo {
        id:string;
        title:string;
        url:string;
        thumbnail:string;
        description:string;
        _filename:string;
        format_id:string;
    }
}
