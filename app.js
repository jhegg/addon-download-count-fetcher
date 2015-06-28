#!/usr/bin/env node

var program = require('commander');
var request = require('request');
var cheerio = require('cheerio');
var moment = require('moment');
var fs = require('fs');
var csv = require('csv');
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');

program
  .version('0.0.1')
  .usage('-f <addons.json>')
  .option('-f, --file <file>', 'Path to JSON file with addon details (required)')
  .option('-o, --outputFile <file>', 'Path to CSV output file (optional)')
  .option('-m, --mongoCollection <collection>', 'MongoDB collection to insert into (optional)');

program.on('--help', function () {
  var addonJsonExample = '[\n' +
    '  {\n' +
    '    "name": "GoldCounter",\n' +
    '    "curseforge": "http://wow.curseforge.com/addons/goldcounter/",\n' +
    '    "wowinterface": "http://www.wowinterface.com/downloads/author-318870.html"\n' +
    '  }\n' +
    ']';

  console.log('  Example:');
  console.log('    $ addon-download-count-fetcher -f addon.json');
  console.log('');
  console.log('    addon.json contents:');
  console.log(addonJsonExample);
  console.log('');
});

program.parse(process.argv);

if (!program.file) {
  console.error('Error:', 'The file argument was not provided.');
  program.help();
  process.exit(1)
}

var jsonFile = program.file;
var outputFile = program.outputFile;
var mongoCollection = program.mongoCollection;
var jsonFromFile;
var results = {};
var mongoUrl = 'mongodb://localhost:27017/joshtest';

fs.readFile(jsonFile, parseJsonFile);

function parseJsonFile(err, data) {
  if (err) throw err;
  jsonFromFile = JSON.parse(data);
  if (jsonFromFile.length < 1) throw new Error('Expected JSON file to have at least one addon entry.');
  for (var addon in jsonFromFile) {
    var addonName = jsonFromFile[addon].name;
    if (addonName === undefined)
      throw new Error('"name" was missing for an addon entry in the JSON file.');

    var curseforgeUrl = jsonFromFile[addon].curseforge;
    if (curseforgeUrl === undefined)
      throw new Error('"curseforge" was missing for an addon entry in the JSON file.');

    var wowinterfaceUrl = jsonFromFile[addon].wowinterface;
    if (wowinterfaceUrl === undefined)
      throw new Error('"wowinterface" was missing for an addon entry in the JSON file.');

    scrapeDownloadCountFromUrl(curseforgeUrl, addonName, getDownloadCountFromScrapedCurseForgeHtml);
    scrapeDownloadCountFromUrl(wowinterfaceUrl, addonName, getDownloadCountFromScrapedWowInterfaceHtml);
  }
}

function reportTotalIfReady(addonName, count) {
  if (results[addonName] === undefined) {
    results[addonName] = {};
    results[addonName].count = count;
    return;
  }

  results[addonName].count += count;
  console.log(moment().format(), addonName, results[addonName].count);

  if (outputFile) {
    outputCsvToFile(addonName);
  }

  if (mongoCollection) {
    MongoClient.connect(mongoUrl, function(err, db) {
      assert.equal(null, err);
      insertMongoDocument(db, addonName, results[addonName].count, function() {
        db.close();
      });
    });
  }
}

function outputCsvToFile(addonName) {
  var input = [[moment().format(), addonName, results[addonName].count]];
  csv.stringify(input, function(err, output) {
    if (err) {
      console.error(err);
      return;
    }
    fs.appendFile(outputFile, output, function (err) {
      if (err) throw err;
      console.log('Wrote CSV: ' + output)
    })
  });
}

function insertMongoDocument(db, addonName, count, callback) {
  db.collection(mongoCollection).insertOne({
    "timestamp": moment().format(),
    "addonName": addonName,
    "count": count
  }, function(err, result) {
    assert.equal(err, null);
    console.log('Inserted a document for ' + addonName + ' into collection ' + mongoCollection);
    callback(result);
  });
}

function getDownloadCountFromScrapedCurseForgeHtml(addonName, html) {
  var $ = cheerio.load(html);
  var downloadsElement = $('dt:contains("Downloads")');
  var downloadCountElement = downloadsElement.next();
  return Number(downloadCountElement.text());
}

function getDownloadCountFromScrapedWowInterfaceHtml(addonName, html) {
  var $ = cheerio.load(html);
  var titleElement = $('a:contains(' + addonName + ')');
  var titleRow = titleElement.parent().parent().parent();
  var downloadCountRow = titleRow.children().last();
  var downloadCountElement = downloadCountRow.children().first();
  return Number(downloadCountElement.text());
}

function scrapeDownloadCountFromUrl(url, addonName, callback) {
  request(url, function (error, response, html) {
    if (!error && response.statusCode == 200) {
      var count = callback(addonName, html);
      reportTotalIfReady(addonName, count);
    } else {
      if (error) throw error;
      console.error('Error: statusCode=' + response.statusCode + ', url=' + url)
    }
  });
}
