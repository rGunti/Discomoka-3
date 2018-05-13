---
layout: command
title: commandname
command:
    name: commandname
    group: commandgroup
    lead: This is a short description for this command.
    aliases: [some, aliases, here]
    permissions: []
    throttling:
        usages: 1
        duration: 60
    args:
        - name: arg1
          type: String
          description: This is the first argument
          required: true
        - name: arg2
          type: String
          description: This is the second argument
          required: true
        - name: arg3
          type: User
          required: false
          description: This is the last argument but it is optional
          defaultValue: '@everyone'
    examples:
        - 'commandname "This is" example'
        - 'commandname "Some Text" abc123 @TestUser123'
---

## More Content
Here you can write more content about this command
