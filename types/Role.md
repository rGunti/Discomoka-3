---
title: Role Type
layout: type
type: Role
lead: A data type containing a Discord server role.
---

## Usage
Like a [User](./User), Roles can be mentioned using the `@` sing followed by the role name.

![Role mentioning in Discord](/assets/img/commands/rolemention_example.png)

### Examples
```
> rolesetup @admins ...
```

## Configuration
In order to mention roles, an administrator has to first enable role mentioning for this role in the Role settings as shown in the following screenshot.

![Configure Role mentioning](/assets/img/commands/rolemention.png)

1. Open the Server Settings and click on "Roles".
2. Select the role you want to edit.
3. Make sure that "Allow anyone to @mention this role" is enabled.
4. Repeat Step 2 and 3 for all roles you want or need to mention.
