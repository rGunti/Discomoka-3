import { Model, Table, Column, Sequelize, DeletedAt, UpdatedAt, CreatedAt } from "sequelize-typescript";

@Table({
    tableName: 'announcements',
    underscored: true
})
export class Announcement extends Model<Announcement> {
    @Column({
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
    })
    id:number;

    @Column({ field: 'title' })
    title:string;

    @Column({ field: 'message' })
    message:string;

    @Column({ field: 'post_by' })
    postBy:Date;

    @Column({ field: 'posted_by' })
    postedBy:Date;

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