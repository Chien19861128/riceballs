var config   = require('../config/default.js');
var utils    = require('../utils');
var mongoose = require('mongoose');
var elasticsearch = require('elasticsearch');
var esClient = new elasticsearch.Client({
  host: config.elasticsearch.host,
  log: 'error'
});
//var Todo     = mongoose.model( 'Todo' );

exports.index = function ( req, res, next ){
    
  var body = {
      size: 20,
      from: 0,
      query: {
        multi_match: {
          fields: ["title", "title2", "title3", "title4", "title5"],
          query: req.query.phrase,
          minimum_should_match: 2,
          fuzziness: "AUTO"
        }
      }
    };

  esClient.search({index: 'anime', body: body}).then(results => {
      res.send(results.hits.hits);
    })
    .catch(console.error);
};