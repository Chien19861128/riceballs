var utils    = require( '../utils' );
var mongoose = require( 'mongoose' );
var slug     = require('slug');
var User           = mongoose.model( 'User' );
var Series         = mongoose.model( 'Series' );
var Episode        = mongoose.model( 'Episode' );
var Group          = mongoose.model( 'Group' );
var Group_Schedule = mongoose.model( 'Group_Schedule' );
var Reddit_Post    = mongoose.model( 'Reddit_Post' );

exports.detail = function ( req, res, next ){
    
  var query_reddit_post = Reddit_Post.findOne({id : req.params.id});
  var promise_reddit_post = query_reddit_post.exec();

  promise_reddit_post.then(function (reddit_post) {
    if (typeof req.user != 'undefined' && typeof reddit_post.group_slug == 'undefined') {
        
      var query_group = Group.find({admins : req.user.name}).sort( '-create_time' );
      var promise_group = query_group.exec();
    
      promise_group.then(function (groups) {
        res.render( 'reddit_post_detail', {
          title : 'Post Details',
          reddit_post: reddit_post,
          groups: groups,
          user  : req.user
        });
      });
    } else {
      res.render( 'reddit_post_detail', {
        title : 'Post Details',
        reddit_post: reddit_post,
        groups: '',
        user  : req.user
      });
    }
  });
};

exports.assign_to = function ( req, res, next ){
  
  if (req.user) {
    Reddit_Post.update({
        id : req.params.id,
        reddit_name: req.user.name
    }, {
        $set: { 
            group_slug: req.params.group_slug,
            update_time : Date.now() 
        }
    }, function (err, updated_reddit_post) {
      if( err ) return next( err );
    
      res.redirect("/reddit_post/" + req.params.id);
    });
  }
};