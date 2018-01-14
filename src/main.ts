import * as debug from 'debug';
import { IDebugger } from 'debug';
import { DiscordBot } from './bot/discomoka';
import { DbInstance } from './db/dbinstance';
import * as config from 'config';
import * as pjson from 'pjson';

class Program {
    static log:IDebugger = debug('discomoka3:main');

    public static main(args:string[]):void {
        let instanceName:string = config.get('instance.id');
        Program.log(`Starting ${pjson.name} with Config Instance ${instanceName}`);

        //Program.log(`Hello world!`);
        //args.forEach(function(arg:string, index:number, array:string[]) {
        //    Program.log(` - Argument ${index}: ${arg}`);
        //});

        let dbInstance:DbInstance = new DbInstance(
            config.get('database.dialect'),
            config.get('database.host'), config.get('database.port'),
            config.get('database.user'), config.get('database.pass'),
            config.get('database.db'),
            {
                min: config.get('database.pool.min'), 
                max: config.get('database.pool.max'), 
                idle: config.get('database.pool.idle') 
            }
        );
        dbInstance.connect();

        if (config.has('music.ffmpegPath')) {
            let ffmpegPath:string = config.get('music.ffmpegPath');
            Program.log(`Adding ffmpeg to PATH (OS: ${process.platform}): ${ffmpegPath}`);
            process.env.PATH += `${process.platform === 'win32' ? ';' : ':'}${ffmpegPath}`;
        }

        let bot:DiscordBot = new DiscordBot();
        bot.start(config.get('discord.token'));
    }
}

Program.main(process.argv);
