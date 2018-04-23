import { Model, Table, Column, CreatedAt, UpdatedAt, DeletedAt, ForeignKey, HasMany, BelongsTo } from 'sequelize-typescript';
import { Sequelize } from 'sequelize-typescript/lib/models/Sequelize';
import { Role } from './Role';
import { Permission } from './Permission';

@Table({
    tableName: 'score_settings',
    paranoid: false,
    underscored: true
})
export class ScoreSettings extends Model<ScoreSettings> {
    @Column({
        field: 'id',
        primaryKey: true
    })
    serverID:string;

    @Column({ field: 'unit_name' })
    unitName:string;

    @Column({ field: 'score_channel' })
    scoreChannel:string;

    @HasMany(() => Score)
    scores:Score[];
}

@Table({
    tableName: 'score',
    underscored: true
})
export class Score extends Model<Score> {
    @Column({
        field: 'id',
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
    })
    id:number;

    @ForeignKey(() => ScoreSettings)
    @Column({ field: 'server_id' })
    serverID:string;

    @BelongsTo(() => ScoreSettings)
    scoreSettings:ScoreSettings;

    @Column({ field: 'user_id' })
    userID:string;

    @Column({ field: 'score' })
    score:number;

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
