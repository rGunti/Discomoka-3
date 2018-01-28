import { Model, Table, Column } from 'sequelize-typescript';
import { CreatedAt } from 'sequelize-typescript/lib/annotations/CreatedAt';
import { UpdatedAt } from 'sequelize-typescript/lib/annotations/UpdatedAt';
import { DeletedAt } from 'sequelize-typescript/lib/annotations/DeletedAt';
import { Sequelize } from 'sequelize-typescript/lib/models/Sequelize';

@Table({
    tableName: 'v_permissions',
    paranoid: false,
    underscored: true,
    timestamps: true
})
export class VServerRolePermission extends Model<VServerRolePermission> {
    @Column({ field: 'server_id' })
    serverID:string;

    @Column({ field: 'server_role_id' })
    serverRoleID:string;

    @Column({ field: 'role_id' })
    roleID:string;

    @Column({ field: 'perm_id' })
    permID:string;
}