var utils       = require( '../utils' );
var mongoose    = require( 'mongoose' );
var User        = mongoose.model( 'User' );
var Series      = mongoose.model( 'Series' );
var Episode     = mongoose.model( 'Episode' );
var Group       = mongoose.model( 'Group' );
var Group_Mvp   = mongoose.model( 'Group_Mvp' );
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
    
  var reddit_post_fields = {};
    
  var d1 = new Date();
  d1.setDate(d1.getDate() - 2);
  var group_fields = {
        is_active: true,
        update_time : {$gt: d1}
    };
    
  if (typeof req.query.filter != 'undefined' && req.query.filter == 'following') {
    if (typeof req.user == 'undefined') res.redirect('/login');
 
    var query_user = User.
      findOne({name: req.user.name});
    
    var promise_user = query_user.exec();
      
    promise_user.then(function (user) {
      var in_groups = user.admin_groups.concat(user.joined_groups);
      reddit_post_fields.group_slug = {$in: in_groups};
      group_fields.slug = {$in: in_groups};
        
      find_following(reddit_post_fields, group_fields);
    });
  } else {
    find_following(reddit_post_fields, group_fields);
  }
  
  function find_following(reddit_post_fields, group_fields) {
    
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
      sort( '-update_time -attending_users_count' );
    
    var promise_reddit_posts = query_reddit_posts.exec();
    var promise_groups = query_groups.exec();

    promise_reddit_posts.then(function (reddit_posts) {
      promise_groups.then(function (groups) {
        
        var thread_counts = {};
        var mvps = {};
        
        count_thread(groups, 0, thread_counts, mvps).then((result) => {
            
          res.render( 'index', {
            title        : 'Home',
            reddit_posts : reddit_posts,
            recent_groups: groups,
            user         : req.user,
            post_page    : post_page,
            filter       : req.query.filter,
            thread_counts: thread_counts,
            mvps         : mvps
          });
        });
      });
    });
  }
    
  async function count_thread(groups, i, thread_counts, mvps) {
    if (groups.length > 0) {
      query_reddit_posts = Reddit_Post.count({group_slug: groups[i].slug});
      thread_counts[groups[i].slug] = await query_reddit_posts.exec();
        
      query_group_mvp = Group_Mvp.findOne({group_slug: groups[i].slug}).sort( '-votes -score_total' );
      mvps[groups[i].slug] = await query_group_mvp.exec();
      i++;
      
      if (i < groups.length) await count_thread(groups, i, thread_counts, mvps);
    }
  }
};

exports.ptws = function( req, res, next ){
    
  req.session.login_redirect = req.originalUrl;
    
  var query_series = Series.find({
      ptws_count: {$gt: 0}
  }).
  sort( '-ptws_count' ).
  limit(100);
    
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

exports.about = function( req, res, next ){
  res.render( 'about', {
    title : 'About this Site',
    user  : req.user
  });
};