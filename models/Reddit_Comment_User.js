var mongoose = require( 'mongoose' );
var findOrCreate = require('mongoose-find-or-create');
var Schema   = mongoose.Schema;

var Reddit_Comment_User = new Schema({
    reddit_post_id: String,
    reddit_name   : String,
    comment_count : Number,
    first_comment_time: Date,
    last_comment_time: Date,
    create_time   : Date,
    update_time   : Date,
    is_notified   : Boolean
});

Reddit_Comment_User.plugin(findOrCreate);

module.exports = mongoose.model( 'Reddit_Comment_User', Reddit_Comment_User );