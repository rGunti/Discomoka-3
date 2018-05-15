---
title: DateTime Type
layout: type
type: DateTime
lead: A data type containing a point in time.
---

## Usage
Enter the date and time between two `"` in the following format: `YYYY-MM-DD HH:mm[:ss]`.
Note that you are able to ommit the seconds.

### Examples
`"2018-02-15 20:15"` = February 15th, 2018 - 8:15:00 pm UTC

`"2015-05-05 05:58:22"` = May 5th, 2018 - 5:58:22 am UTC

## Timezone
The date and time will be processed **in UTC** so you will need to adjust the entry for your own timezone. Also keep in mind that you will need to subtract daylight savings time (**DST**) if applicable.

### Examples
If you want to enter _June 1st, 2018 - 3:15 pm CEST_, you'll need to enter `"2018-06-01 13:15"` as _CEST_ is UTC+2.

If you want to enter _June 1st, 2018 - 12:00 am PDT_, you'll need to enter `"2018-06-01 7:00"` as _PDT_ is UTC-7.
