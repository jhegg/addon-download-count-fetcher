# addon-download-count-fetcher
Scrapes the addon download count from CurseForge and WowInterface, similar to wow-scrape-addon-download-count but
with more options.

## What is it?
This is a Node.JS script with a CLI that allows you to quickly fetch the current download counts from one or more 
World of Warcraft addons, which have been published to both WoWInterface and CurseForge.

Using a JSON file with addon names and URLs as input, it will then output the total counts to stdout. Can 
optionally output to a CSV file, or to a local MongoDB collection.

## Requirements
* Node.JS 0.12 or newer
* At least one addon that is published to both WoWInterface and CurseForge
* A JSON file with addon information (see below)

## How do I use it?

### JSON input
The JSON file should contain an array of one or more addons, where each must have a `name`, `curseforge` addon URL,
and `wowinterface` author portal URL. For example:

```json
[
  {
    "name": "GoldCounter",
    "curseforge": "http://wow.curseforge.com/addons/goldcounter/",
    "wowinterface": "http://www.wowinterface.com/downloads/author-318870.html"
  },
  {
    "name": "WhichBossesAreLeft",
    "curseforge": "http://wow.curseforge.com/addons/whichbossesareleft/",
    "wowinterface": "http://www.wowinterface.com/downloads/author-318870.html"
  },
  {
    "name": "HeroicRaidReady",
    "curseforge": "http://wow.curseforge.com/addons/heroicraidready/",
    "wowinterface": "http://www.wowinterface.com/downloads/author-318870.html"
  }
]
```

### CLI

1. `npm install -g`
2. `addon-download-count-fetcher` to see the usage and an example command line.

## What does the output look like?

Standard out:
```
$ addon-download-count-fetcher -f addon.json
2015-06-28T11:26:45-07:00 WhichBossesAreLeft 651
2015-06-28T11:26:45-07:00 HeroicRaidReady 751
2015-06-28T11:26:45-07:00 GoldCounter 304
```

CSV:
```
$ addon-download-count-fetcher -f addon.json -o output.csv
$ cat output.csv
2015-06-28T11:27:23-07:00,GoldCounter,304
2015-06-28T11:27:23-07:00,HeroicRaidReady,751
2015-06-28T11:27:23-07:00,WhichBossesAreLeft,651
```

MongoDB:
```
$ addon-download-count-fetcher -f addon.json -d testdb -m addons
$ mongo test
MongoDB shell version: 3.0.4
connecting to: test
> db.addons.find()
{ "_id" : ObjectId("55903e5aa7ba57bc44e38bd1"), "timestamp" : "2015-06-28T11:35:06-07:00", "addonName" : "WhichBossesAreLeft", "count" : 651 }
{ "_id" : ObjectId("55903e5aa7ba57bc44e38bd2"), "timestamp" : "2015-06-28T11:35:06-07:00", "addonName" : "HeroicRaidReady", "count" : 751 }
{ "_id" : ObjectId("55903e5aa7ba57bc44e38bd3"), "timestamp" : "2015-06-28T11:35:06-07:00", "addonName" : "GoldCounter", "count" : 304 }
```
