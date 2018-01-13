import { Sequelize } from "sequelize-typescript";
import { IDebugger } from "debug";
import * as debug from 'debug';
import { Song } from "./model/Song";
import * as randomstring from 'randomstring';

export class DbInstance {
    seqInstance:Sequelize;
    debugLog:IDebugger;
    errorLog:IDebugger;
    instanceID:string;

    constructor(dialect:string, host:string, port:number, user:string, password:string, dbname:string, poolSettings:{
        min:number; max:number; idle:number;
    }) {
        this.instanceID = randomstring.generate(16);
        this.debugLog = debug(`discomoka3:DB ${this.instanceID}:Debug`);
        this.errorLog = debug(`discomoka3:DB ${this.instanceID}:Error`);
        this.init(dialect, host, port, user, password, dbname, poolSettings);
    }

    public init(dialect:string, host:string, port:number, user:string, password:string, dbname:string, poolSettings:{
        min:number; max:number; idle:number;
    }):void {
        this.debugLog(`Initializing DB Connection ...`);
        let seq:Sequelize = new Sequelize({
            dialect: dialect,
            host: host,
            port: port,
            username: user,
            password: password,
            name: dbname,
            pool: poolSettings
        });

        this.debugLog(`Adding models ...`);
        seq.addModels([
            Song
        ]);

        this.seqInstance = seq;
    }

    public connect():void {
        let self = this;
        this.seqInstance.authenticate()
            .then(() => {
                self.debugLog(`DB Connection established`);
                Song.build({
                    serverID: '000000000000000000',
                    uploadedBy: '000000000000000000',
                    title: `Test Entry ${self.instanceID}`,
                    sourceType: 'test',
                    sourceLink: 'mysql://localhost',
                    source: self.instanceID
                }).save();
            })
            .catch((err:Error) => {
                self.errorLog(`Connection to database failed due to an error:\n` + 
                `${err.name}: ${err.message}\n${err.stack}`);
            });
    }
}