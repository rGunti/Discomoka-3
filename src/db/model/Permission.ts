import { Model, Table, Column } from 'sequelize-typescript';
import { CreatedAt } from 'sequelize-typescript/lib/annotations/CreatedAt';
import { UpdatedAt } from 'sequelize-typescript/lib/annotations/UpdatedAt';
import { DeletedAt } from 'sequelize-typescript/lib/annotations/DeletedAt';
import { Sequelize } from 'sequelize-typescript/lib/models/Sequelize';
import { BelongsToMany } from 'sequelize-typescript/lib/annotations/association/BelongsToMany';
import { Role } from './Role';
import { RolePermission } from './RolePermission';

@Table({
    tableName: 'permissions',
    paranoid: false,
    underscored: true
})
export class Permission extends Model<Permission> {
    @Column({
        primaryKey: true,
        validate: { is: /^[0-9A-Za-z\.]+$/i, len: [1, 64] }
    })
    id:string;

    @Column({
        validate: { len: [0, 255] }
    })
    description:string;

    @BelongsToMany(() => Role, () => RolePermission)
    roles:Role[];
}