import { Model, Table, Column } from 'sequelize-typescript';
import { Permission } from './Permission';
import { BelongsToMany } from 'sequelize-typescript/lib/annotations/association/BelongsToMany';
import { RolePermission } from './RolePermission';
import { ServerRoleMapping } from './ServerRoleMapping';
import { HasMany } from 'sequelize-typescript/lib/annotations/association/HasMany';

@Table({
    tableName: 'roles',
    paranoid: false,
    underscored: true
})
export class Role extends Model<Role> {
    public static KEY_OWNER = "owner";
    public static KEY_ADMIN = "admin";
    public static KEY_MOD = "mod";
    public static KEY_SUPPORT = "support";
    public static KEY_MEMBER = "member";
    public static KEY_GUEST = "guest";

    @Column({
        primaryKey: true,
        validate: { is: /^[a-z]+$/i, len: [1, 18] }
    })
    id:string;

    @Column({
        validate: { len: [0, 45] }
    })
    name:string;

    @Column({
        validate: { len: [0, 128] }
    })
    description?:string;

    @BelongsToMany(() => Permission, () => RolePermission)
    permissions:Permission[];

    @HasMany(() => ServerRoleMapping)
    serverRoleMappings:ServerRoleMapping;
}