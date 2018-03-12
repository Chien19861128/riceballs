var mongoose     = require('mongoose');
var findOrCreate = require('mongoose-find-or-create');
var Schema   = mongoose.Schema;

var Group_Schedule = new Schema({
    group_slug  : String,
    series_slug : String,
    link        : String,
    episode_number : Number,
    discussion_time: Date,
    create_time : Date,
    update_time : Date    
});

Group_Schedule.plugin(findOrCreate);

module.exports = mongoose.model( 'Group_Schedule', Group_Schedule );