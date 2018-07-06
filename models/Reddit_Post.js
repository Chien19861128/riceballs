var mongoose     = require('mongoose');
var findOrCreate = require('mongoose-find-or-create');
var Schema       = mongoose.Schema;

var Reddit_Post = new Schema({
    id           : String,
    title        : String,
    subreddit    : String,
    reddit_name  : String,
    url          : String,
    series_slug  : String,
    group_slug   : String,
    comment_count: Number,
    score        : Number,
    comments_over_time: [],
    score_over_time: [],
    is_notified  : Boolean,
    is_private_messaged: Boolean,
    is_discuss_thread: Boolean,
    create_time  : Date,
    update_time  : Date
});

Reddit_Post.virtual('group', {
  ref: 'Group', // The model to use
  localField: 'group_slug', 
  foreignField: 'slug',
  // If `justOne` is true, 'members' will be a single doc as opposed to
  // an array. `justOne` is false by default.
  justOne: true
});

Reddit_Post.plugin(findOrCreate);

module.exports = mongoose.model('Reddit_Post', Reddit_Post);