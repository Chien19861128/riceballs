var mongoose     = require('mongoose');
var findOrCreate = require('mongoose-find-or-create');
var Schema   = mongoose.Schema;

var Group = new Schema({
    slug        : String,
    name        : String,
    series_slugs: [],
    image       : String,
    description : String,
    discussion_link: String,
    admins      : [],
    links       : [],
    tags        : [],
    attending_users: [],
    attending_users_count: Number,
    post_count  : Number,
    min_users   : Number,
    number      : Number,
    is_active   : Boolean,
    is_private  : Boolean,
    is_bot_made : Boolean,
    interest_due_time: Date,
    start_time  : Date,
    create_time : Date,
    update_time : Date
});

Group.plugin(findOrCreate);

module.exports = mongoose.model( 'Group', Group );