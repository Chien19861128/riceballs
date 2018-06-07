var utils    = require( '../utils' );
var mongoose = require( 'mongoose' );
var Series   = mongoose.model( 'Series' );
var Episode  = mongoose.model( 'Episode' );
var Group    = mongoose.model( 'Group' );
var Reddit_Post = mongoose.model( 'Reddit_Post' );
//var Promise  = require('bluebird');

var request = require("request");
var userDetails;

function initialize(url) {
    // Setting URL and headers for request
    var options = {
        url: url,
        headers: {
            'User-Agent': 'request'
        }
    };
    // Return new promise 
    return new Promise(function(resolve, reject) {
    	// Do async job
        request.get(options, function(err, resp, body) {
            if (err) {
                reject(err);
            } else {
                resolve(JSON.parse(body));
            }
        })
    })
}

exports.index = function ( req, res, next ){
  req.session.login_redirect = req.originalUrl;
   
  /*    
  var initializePromise = initialize('https://api.github.com/users/narenaryan');
    initializePromise.then(function(result) {
        userDetails = result;
        console.log("Initialized user details");
        // Use user details from here
        console.log(userDetails)
    }, function(err) {
        console.log(err);
    });*/
    
  //var allPromise = Promise.all([ initialize('https://api.github.com/users/narenaryan'), initialize('https://api.github.com/users/chien19861128') ]);
  //allPromise.then(console.log, console.error);
  var reddit_post_fields = {};
  var group_fields = {
        is_active: true,
        series_slugs: { $ne: null }
    };
    
  if (typeof req.query.filter != 'undefined' && req.query.filter == 'following') {
      
    console.log('[req.query.filter]' + req.query.filter);
    if (typeof req.user == 'undefined') res.redirect('/login');
 
    var in_groups = req.user.admin_groups.concat(req.user.joined_groups);
      
    reddit_post_fields.group_slug = {$in: in_groups};
    group_fields.slug = {$in: in_groups};
  }
  
  var post_page = 1;
  var post_skip = 0;
  var post_limit = 10;
  
  if (typeof req.query.post_page != 'undefined') {
      post_page = req.query.post_page;
      post_skip = (post_page - 1) * 10;
  }
    
  var query_reddit_posts = Reddit_Post.
    find(reddit_post_fields).
    populate('group').
    sort( '-create_time' ).
    skip(post_skip).
    limit(10);
    
  var query_groups = Group.
    find(group_fields).
    sort( '-update_time -attending_users_count' ).
    limit(6);
    
  //assert.ok(!(query instanceof Promise));
  var promise_reddit_posts = query_reddit_posts.exec();
  var promise_groups = query_groups.exec();

  promise_reddit_posts.then(function (reddit_posts) {
      
    promise_groups.then(function (groups) {
      res.render( 'index', {
        title        : 'Home',
        reddit_posts : reddit_posts,
        recent_groups: groups,
        user         : req.user,
        post_page    : post_page,
        req          : req.query.filter
      });
    });
  });
};

exports.ptws = function( req, res, next ){
    
  var query_series = Series.find({
      ptws_count: {$gt: 0}
  }).
  sort( '-ptws_count' ).
  limit(6);
    
  var promise_series = query_series.exec();
    
  promise_series.then(function (series) {
    res.render( 'ptws', {
      title : 'Top Plan to Watch SOON Series',
      series: series,
      user  : req.user
    });
  });
};

// ** express turns the cookie key to lowercase **
exports.current_user = function ( req, res, next ){
  var user_id = req.cookies ?
      req.cookies.user_id : undefined;

  if( !user_id ){
    res.cookie( 'user_id', utils.uid( 32 ));
  }

  next();
};