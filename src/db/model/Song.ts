import { Model, Table, Column } from 'sequelize-typescript';
import { CreatedAt } from 'sequelize-typescript/lib/annotations/CreatedAt';
import { UpdatedAt } from 'sequelize-typescript/lib/annotations/UpdatedAt';
import { DeletedAt } from 'sequelize-typescript/lib/annotations/DeletedAt';
import { Sequelize } from 'sequelize-typescript/lib/models/Sequelize';

@Table({
    tableName: 'songs',
    paranoid: true,
    underscored: true
})
export class Song extends Model<Song> {
    @Column({
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
    })
    id:number;

    @Column({
        field: 'server_id',
        validate: { is: /^[0-9]+$/i, len: [1, 18] }
    })
    serverID:string;

    @Column({
        field: 'uploaded_by',
        validate: { is: /^[0-9]+$/i, len: [1, 18] }
    })
    uploadedBy:string;

    @Column({
        field: 'title',
        validate: { len: [1, 255] }
    })
    title: string;

    @Column({
        field: 'artist',
        validate: { len: [1, 255] }
    })
    artist: string;

    @Column({
        field: 'source_type'
    })
    sourceType:string;

    @Column({
        field: 'source_link'
    })
    sourceLink:string;
    
    @Column({
        field: 'source'
    })
    source:string

    @Column({
        field: 'created_at'
    })
    @CreatedAt
    createdAt:Date;

    @Column({
        field: 'updated_at'
    })
    @UpdatedAt
    updatedAt:Date;

    @Column({
        field: 'deleted_at'
    })
    @DeletedAt
    deletedAt?:Date;
}