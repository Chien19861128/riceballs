(function () {
  'use strict';

  const config = require('./config/default.js');
  const fs = require('fs');
  const mongoose = require('mongoose');
  const xml2js = require('xml2js');
  const util = require("util");
  const http = require('http');
  const slug = require('slug');
  const async = require('async');
  const elasticsearch = require('elasticsearch');
  const esClient = new elasticsearch.Client({
    host: config.elasticsearch.host,
    log: 'error'
  });

  //const Todo    = require('./models/Todo');
  const Series  = require('./models/Series');
  const Episode = require('./models/Episode');
  mongoose.connect(config.mongoose.connection);
    
  const bulkIndex = function bulkIndex(index, type, data) {
    let bulkBody = [];

    data.forEach(item => {
      bulkBody.push({
        delete: {
          _index: index,
          _type: type,
          _id: item.slug
        }
      });
        
      bulkBody.push({
        index: {
          _index: index,
          _type: type,
          _id: item.slug
        }
      });
        
      item.vintage = item.vintage.split(" ")[0];
        
      bulkBody.push(item);
    });
      
    esClient.bulk({body: bulkBody})
    .then(response => {
      let errorCount = 0;
      response.items.forEach(item => {
        if (item.index && item.index.error) {
          console.log(++errorCount, item.index.error);
        }
      });
      console.log(`Successfully indexed ${data.length - errorCount} out of ${data.length} items`);
    })
    .catch(console.err);
  };

  // only for testing purposes
  // all calls should be initiated through the module
  const test = function test() {
    Series.find({}).
    select('-_id slug title title2 title3 title4 title5 type description episode_count vintage official_tags ann_id').
    exec( function ( err, series ){
      if( err ) return next( err );
        
      //console.log(JSON.stringify(series, null, 4));
        
      console.log(`${series.length} items parsed from data file`);
      bulkIndex('anime', 'series', series);
    });
  };

  test();

  module.exports = {
    bulkIndex
  };
} ());