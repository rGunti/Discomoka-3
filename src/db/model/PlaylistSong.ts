import { Sequelize, Model, Column, CreatedAt, UpdatedAt, DeletedAt, Table, ForeignKey } from "sequelize-typescript";
import { Song } from "./Song";
import { Playlist } from "./Playlist";

@Table({
    tableName: 'playlist_songs',
    paranoid: false,
    underscored: true
})
export class PlaylistSong extends Model<PlaylistSong> {
    @Column({
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
    })
    id:number;

    @ForeignKey(() => Playlist)
    @Column({ field: 'playlist_id' })
    playlistID:number;

    @ForeignKey(() => Song)
    @Column({ field: 'song_id' })
    songID:number;
}