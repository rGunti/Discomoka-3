import { Model, Table, Column, CreatedAt, UpdatedAt, DeletedAt } from 'sequelize-typescript';
import { Sequelize } from 'sequelize-typescript/lib/models/Sequelize';
import { ForeignKey } from 'sequelize-typescript/lib/annotations/ForeignKey';

@Table({
    tableName: 'reddit_autopost_settings',
    underscored: true
})
export class RedditAutoPostSettings extends Model<RedditAutoPostSettings> {
    @Column({
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
    })
    id:number;
    
    @Column({ field: 'server_id' })
    serverID:string;
    
    @Column({ field: 'subreddit' })
    subreddit:string;
    
    @Column({ field: 'target_channel' })
    targetChannel:string;
    
    @Column({ field: 'interval' })
    interval:number;
    
    @Column({ field: 'last_post' })
    lastPost:string;

    @Column({ field: 'last_post_timestamp' })
    lastPostTimestamp:Date;

    @Column({ field: 'created_at' })
    @CreatedAt
    createdAt:Date;

    @Column({ field: 'updated_at' })
    @UpdatedAt
    updatedAt:Date;

    @Column({ field: 'deleted_at' })
    @DeletedAt
    deletedAt?:Date;
}