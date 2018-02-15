import { Sequelize, Model, Column, CreatedAt, UpdatedAt, DeletedAt, Table, HasMany, BelongsToMany } from "sequelize-typescript";
import { Song } from "./Song";
import { PlaylistSong } from "./PlaylistSong";

export declare interface Playlist {
    addSong(song:Song);
    addSongs(songs:Song[]);

    createSong(song:Song):Promise<Song>|PromiseLike<Song>;

    getSongs():Promise<Song[]>|PromiseLike<Song[]>;

    hasSong(song:Song):Promise<boolean>|PromiseLike<boolean>;
    hasSongs(songs:Song[]):Promise<boolean>|PromiseLike<boolean>;

    removeSong(song:Song):Promise<void>;
    removeSongs(songs:Song[]):Promise<void>;

    setSongs(songs:Song[]):Promise<Song[]>;
}

@Table({
    tableName: 'playlists',
    paranoid: false,
    underscored: true
})
export class Playlist extends Model<Playlist> {
    @Column({
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
    })
    id:number;

    @Column({
        validate: { len: [1, 64] }
    })
    name:string;

    @Column({
        field: 'server_id',
        validate: { is: /^[0-9]+$/i, len: [1, 18] }
    })
    serverID:string;


    @Column({
        field: 'created_by',
        validate: { is: /^[0-9]+$/i, len: [1, 18] }
    })
    createdBy:string;

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

    @BelongsToMany(() => Song, () => PlaylistSong)
    songs:Song[];
}