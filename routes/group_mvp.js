var utils    = require( '../utils' );
var mongoose = require( 'mongoose' );
var slug     = require('slug');
var User           = mongoose.model( 'User' );
var Group          = mongoose.model( 'Group' );
var Group_Mvp      = mongoose.model( 'Group_Mvp' );

exports.vote = function( req, res, next ){
  if (typeof req.user == 'undefined') res.redirect('/login'); 
    
  var query_group_mvp = Group_Mvp.findOne({
      group_slug : req.params.group_slug, 
      reddit_name : req.params.reddit_name
  });
  var promise_group_mvp = query_group_mvp.exec();
    
  promise_group_mvp.then(function (group_mvp) {
    if (promise_group_mvp) {
      
      Group_Mvp.update({
          group_slug : req.params.group_slug, 
          reddit_name : req.params.reddit_name
      }, {
          $addToSet: { 
              votes: req.user.name
          },
          $set: {
              update_time : Date.now() 
          }
      }, function (err, updated_group_mvp) {
        if( err ) return next( err );
        
        if (typeof req.session.login_redirect != 'undefined') res.redirect( req.session.login_redirect );
        else res.redirect( '/group_mvp/' + req.params.group_slug );
      });
    } else {
      if (typeof req.session.login_redirect != 'undefined') res.redirect( req.session.login_redirect );
      else res.redirect( '/group_mvp/' + req.params.group_slug );
    }
  });
}

exports.index = function( req, res, next ){
  req.session.login_redirect = req.originalUrl;
    
  var query_group = Group.findOne({
      slug : req.params.group_slug
  });
  var promise_group = query_group.exec();
    
  var query_group_mvp = Group_Mvp.find({
      group_slug : req.params.group_slug
  }).sort( '-votes -score_total -attend_count' );
  var promise_group_mvp = query_group_mvp.exec();
    
  promise_group.then(function (group) {
    promise_group_mvp.then(function (group_mvp) {
      res.render( 'group_mvp', {
        title     : 'Vote for the MVP!',
        group     : group,
        group_mvp : group_mvp,
        user      : req.user,
      });
    });
  });
}