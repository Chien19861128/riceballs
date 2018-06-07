var utils    = require( '../utils' );
var mongoose = require( 'mongoose' );
var User           = mongoose.model( 'User' );
var Series         = mongoose.model( 'Series' );
var Episode        = mongoose.model( 'Episode' );
var Group          = mongoose.model( 'Group' );
var Group_Schedule = mongoose.model( 'Group_Schedule' );

exports.me = function( req, res, next ){
  req.session.login_redirect = req.originalUrl;
  if (typeof req.user == 'undefined') res.redirect('/login');
 
  var in_groups = req.user.admin_groups.concat(req.user.joined_groups);
    
  //var query_admin_groups = Group.find({slug : {$in: req.user.admin_groups}});
  //var query_joined_groups = Group.find({slug : {$in: req.user.joined_groups}});
  var query_group = Group.find({
      discussion_time: {$gt: Date.now()},
      group_slug: {$in: in_groups}}).
    sort('-update_time');
    
  //var promise_admin_groups = query_admin_groups.exec();
  //var promise_joined_groups = query_joined_groups.exec();
  var promise_schedule = query_schedule.exec();

  //promise_admin_groups.then(function (admin_groups) {
    //promise_joined_groups.then(function (joined_groups) {
  promise_schedule.then(function (schedule) {
    var series_slugs = new Array();
    var cnt = 0;
    for (i=0; i<schedule.length; i++) {
      if(series_slugs.indexOf(schedule[i].series_slug) == -1) {
        series_slugs[cnt] = schedule[i].series_slug;
        cnt++
      }
    } 
      
    Series.find({slug: {$in: series_slugs}}).
    exec( function ( err, series ){
      if( err ) return next( err );

      var series_names = [];
        
      for (i=0; i<series.length; i++) {
        series_names[series[i].slug] = series[i].title;
      }
        
      var monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "June", "July", "Aug", "Sep", "Oct", "Nov", "Dec"];
      var current_date;
      var current_series;
      var current_episodes = "";
      var current_group = "";
      var date_cnt = 0;
      var current_schedule = new Array();
        
      for (i=0; i<schedule.length; i++) {
        var val = schedule[i];
          
        var schedule_date = monthNames[val.discussion_time.getUTCMonth()] + ' ' + val.discussion_time.getUTCDate() + ' ' + val.discussion_time.getUTCFullYear() + ' ' + val.discussion_time.getUTCHours() + 'GMT';
          
        if (i==0) {
          var time_diff = val.discussion_time.getTime() - Date.now();
          var day_diff = parseInt((time_diff)/(24*3600*1000));
          var hour_diff = parseInt(((time_diff)%(24*3600*1000))/(3600*1000));
          var time_diff_str = "(in " + day_diff + "d" + hour_diff + "h)";
        }
          
        if (typeof current_date == "undefined") {
          current_episodes = series_names[val.series_slug] + ' EP ' + val.episode_number;
          current_date = schedule_date;
          current_series = val.series_slug;
          current_group = val.group_slug;
        } else if (current_date != schedule_date || current_series != val.series_slug) {
          if (date_cnt==0) current_date = current_date + time_diff_str;
          current_schedule[date_cnt] = [current_date, current_episodes, current_group];
          date_cnt++;
                
          current_date = schedule_date;
          current_episodes = series_names[val.series_slug] + ' EP ' + val.episode_number;
          current_series = val.series_slug;
          current_group = val.group_slug;
        } else if (i == (schedule.length - 1)) {
          current_episodes = current_episodes + ", " + val.episode_number;
        
          if (date_cnt==0) current_date = current_date + time_diff_str;
          current_schedule[date_cnt] = [current_date, current_episodes, current_group];
        } else {
          current_episodes = current_episodes + ", " + val.episode_number;
        }
      }
        
      res.render( 'user_me', {
        title       : 'My Groups',
        schedule    : current_schedule,
        series_names: series_names,
        user        : req.user
      });
    });
  });
};
    
exports.ptws = function( req, res, next ){
  req.session.login_redirect = req.originalUrl;
  if (typeof req.user == 'undefined') res.redirect('/login');
    
  var query_series = Series.find({
      slug: {$in: req.user.ptws}});
    
  var promise_series = query_series.exec();
    
  promise_series.then(function (series) {
    res.render( 'user_ptws', {
      title : 'Plan to Watch SOON List',
      series: series,
      user  : req.user
    });
  });
};
    
exports.ptws_add = function( req, res, next ){
  if (typeof req.user == 'undefined') res.redirect('/login');

  var query_series = Series.findOne({slug : req.body.slug});
  var promise_series = query_series.exec();
    
  promise_series.then(function (series) {
    
    var new_ptws_count = 1;
    if (series.ptws_count) new_ptws_count = series.ptws_count + 1;
      
    Series.update({
        slug : req.body.slug
    }, {
        $set: { 
            ptws_count: new_ptws_count
        }
    }, function (err, updated_series) {
      if( err ) return next( err );
    
      User.update({
          name : req.user.name
      }, { 
          $push: {ptws: req.body.slug}
      }, function (err, updated_user) {
        if( err ) return next( err );
        
        req.user.ptws.push(req.body.slug);
            
        if (typeof req.session.login_redirect != 'undefined') res.redirect( req.session.login_redirect );
        else res.redirect( '/user/ptws' );
      });
    });
  });
};
    
exports.ptws_remove = function( req, res, next ){
  if (typeof req.user == 'undefined') res.redirect('/login');

  var query_series = Series.findOne({slug : req.params.slug});
  var promise_series = query_series.exec();
    
  promise_series.then(function (series) {
    
    var new_ptws_count = 0;
    if (series.ptws_count && series.ptws_count > 0) new_ptws_count = series.ptws_count - 1;
      
    Series.update({
        slug : req.params.slug
    }, {
        $set: { 
            ptws_count: new_ptws_count
        }
    }, function (err, updated_series) {
      if( err ) return next( err );
      
      User.update({
          name : req.user.name
      }, { 
          $pull: {ptws: req.params.slug}
      }, function (err, updated_user) {
        if( err ) return next( err );
        
        var series_index = req.user.ptws.indexOf(req.params.slug);
        req.user.ptws.splice(series_index, 1);
            
        if (typeof req.session.login_redirect != 'undefined') res.redirect( req.session.login_redirect  );
        else res.redirect( '/user/ptws' );
      });
    });
  });
};