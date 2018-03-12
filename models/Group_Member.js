var mongoose     = require('mongoose');
var findOrCreate = require('mongoose-find-or-create');
var Schema   = mongoose.Schema;

var Group_Member = new Schema({
    group_slug  : String,
    user_name   : String,
    create_time : Date,
    update_time : Date    
});

Group_Member.plugin(findOrCreate);

module.exports = mongoose.model( 'Group_Member', Group_Member );