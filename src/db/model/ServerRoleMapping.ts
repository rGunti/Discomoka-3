import { Model, Table, Column, Sequelize } from 'sequelize-typescript';
import { ForeignKey } from 'sequelize-typescript/lib/annotations/ForeignKey';
import { Role } from './Role';
import { BelongsTo } from 'sequelize-typescript/lib/annotations/association/BelongsTo';
import { CreatedAt } from 'sequelize-typescript/lib/annotations/CreatedAt';
import { UpdatedAt } from 'sequelize-typescript/lib/annotations/UpdatedAt';

@Table({
    tableName: 'server_role_mapping',
    paranoid: false,
    underscored: true
})
export class ServerRoleMapping extends Model<ServerRoleMapping> {
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
        field: 'server_role_id',
        validate: { is: /^[0-9]+$/i, len: [1, 18] }
    })
    serverRoleID:string;

    @ForeignKey(() => Role)
    @Column({
        field: 'role_id',
        validate: { is: /^[a-z]+$/i, len: [1, 18] }
    })
    roleID:string;

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

    @BelongsTo(() => Role)
    role:Role;
}