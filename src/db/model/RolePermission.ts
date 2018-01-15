import { Model, Table, Column } from 'sequelize-typescript';
import { Sequelize } from 'sequelize-typescript/lib/models/Sequelize';
import { ForeignKey } from 'sequelize-typescript/lib/annotations/ForeignKey';
import { Role } from './Role';
import { Permission } from './Permission';

@Table({
    tableName: 'role_permissions',
    paranoid: false,
    underscored: true
})
export class RolePermission extends Model<RolePermission> {
    @Column({
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
    })
    id:number;

    @ForeignKey(() => Role)
    @Column({ field: 'role_id' })
    roleID:string;

    @ForeignKey(() => Permission)
    @Column({ field: 'perm_id' })
    permID:string;
}