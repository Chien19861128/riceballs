var utils    = require( '../utils' );
var mongoose = require( 'mongoose' );
var Series   = mongoose.model( 'Series' );
var Episode  = mongoose.model( 'Episode' );
var Group    = mongoose.model( 'Group' );
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
    
  var query_ongoing_groups = Group.
    find({
        //is_active: true,
        attending_users_count: { Sgte: 5 },
        start_time: { $lt: Date.now() }
    }).
    sort( '-attending_users_count -update_time' ).
    limit(6);
    
  var query_upcoming_groups = Group.
    find({
        //is_active: true,
        attending_users_count: { Sgte: 5 },
        start_time: { $gt: Date.now() }
    }).
    sort( '-attending_users_count -update_time' ).
    limit(6);
  //assert.ok(!(query instanceof Promise));
  var promise_ongoing_groups = query_ongoing_groups.exec();
  var promise_upcoming_groups = query_upcoming_groups.exec();

  promise_ongoing_groups.then(function (ongoing_groups) {
    promise_upcoming_groups.then(function (upcoming_groups) {
      res.render( 'index', {
        title          : 'Home',
        ongoing_groups : ongoing_groups,
        upcoming_groups: upcoming_groups,
        user           : req.user
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