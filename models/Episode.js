var mongoose     = require('mongoose');
var findOrCreate = require('mongoose-find-or-create');
var Schema   = mongoose.Schema;

var Episode = new Schema({
    series_slug : String,
    number      : Number,
    title       : String,
    create_time : Date,
    update_time : Date
});

Episode.plugin(findOrCreate);

module.exports = mongoose.model( 'Episode', Episode );