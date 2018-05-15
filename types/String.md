---
title: String Type
layout: type
type: String
lead: A data type containing text.
---

## Usage
If the entered text contains spaces, you will need to use `"` around it. Otherwise the text will be interpreted as multiple arguments which can mess up your input.

### Examples
```
> announce NoSpacesHere "But spaces in here" "2018-01-01 20:00"
> announce "This is a text with spaces" "This is a lot more text that contains a lot of spaces" "2018-01-01 20:00"
```
