var mongoose     = require('mongoose');
var findOrCreate = require('mongoose-find-or-create');
var Schema   = mongoose.Schema;

var User = new Schema({
    name         : String,
    password     : String,
    reddit_id    : String,
    reddit_name  : String,
    reddit_karma : Number,
    reddit_create_time: Date,
    create_time  : Date,
    update_time  : Date,
    admin_groups : [],
    joined_groups: []
});

User.plugin(findOrCreate);

module.exports = mongoose.model( 'User', User );