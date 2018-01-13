import * as debug from 'debug';
import { IDebugger } from 'debug';
import { DiscordBot } from './bot/discomoka';
import { DbInstance } from './db/dbinstance';

class Program {
    static log:IDebugger = debug('discomoka3:main');

    public static main(args:string[]):void {
        Program.log(`Hello world!`);
        args.forEach(function(arg:string, index:number, array:string[]) {
            Program.log(` - Argument ${index}: ${arg}`);
        });

        let dbInstance:DbInstance = new DbInstance(
            'mysql',
            '127.0.0.1', 3306,
            'root', 'root',
            'discomoka3',
            { min: 0, max: 10, idle: 10000 }
        );
        dbInstance.connect();

        let bot:DiscordBot = new DiscordBot();
        bot.start('MjI2Njg4ODQyNzA1NDAzOTA1.DTllJA.EdKryLguJ3EzNjbFYPOeJLjY6xM');
    }
}

Program.main(process.argv);
