var mongoose     = require('mongoose');
var findOrCreate = require('mongoose-find-or-create');
var Schema   = mongoose.Schema;

var Series = new Schema({
    slug         : String,
    ann_id       : Number,
    title        : String, 
    title2       : String, 
    title3       : String, 
    title4       : String, 
    title5       : String, 
    type         : String, 
    description  : String, 
    episode_count: Number, 
    length       : Number, 
    vintage      : String, 
    official_tags: [],
    create_time  : Date,
    update_time  : Date
});

Series.plugin(findOrCreate);

module.exports = mongoose.model( 'Series', Series );