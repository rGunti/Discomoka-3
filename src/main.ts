import * as debug from 'debug';
import { IDebugger } from 'debug';

class Program {
    static log:IDebugger = debug('discomoka3:main');

    public static main(args:string[]):void {
        Program.log(`Hello world!`);
        args.forEach(function(arg:string, index:number, array:string[]) {
            Program.log(` - Argument ${index}: ${arg}`);
        });
    }
}

Program.main(process.argv);
