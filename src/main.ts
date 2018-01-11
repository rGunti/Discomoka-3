class Program {
    public static main(args:string[]):void {
        console.log('Hello world!');
        args.forEach(function(arg:string, index:number, array:string[]) {
            console.log(` - Argument ${index}: ${arg}`);
        });
    }
}

Program.main(process.argv);
