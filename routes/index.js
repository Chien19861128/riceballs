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
  
  var post_page = 1;
  var post_skip = 0;
  var post_limit = 10;
  
  if (typeof req.query.post_page != 'undefined') {
      post_page = req.query.post_page;
      post_skip = (post_page - 1) * 10;
  }
    
  var query_reddit_posts = Reddit_Post.
    find({}).
    populate('group').
    sort( '-create_time' ).
    skip(post_skip).
    limit(10);
    
  var query_recent_groups = Group.
    find({
        //is_active: true,
        //attending_users_count: { $gte: 3 },
        //start_time: { $lt: Date.now() },
        //end_time: { $gt: Date.now() }
        series_slugs: { $ne: null }
    }).
    sort( '-attending_users_count -update_time' ).
    limit(6);
    
  //assert.ok(!(query instanceof Promise));
  var promise_reddit_posts = query_reddit_posts.exec();
  var promise_recent_groups = query_recent_groups.exec();

  promise_reddit_posts.then(function (reddit_posts) {
      
    console.log(reddit_posts);
      
    promise_recent_groups.then(function (recent_groups) {
      res.render( 'index', {
        title         : 'Home',
        reddit_posts  : reddit_posts,
        recent_groups : recent_groups,
        user          : req.user,
        post_page     : post_page
      });
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