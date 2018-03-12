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
    
  console.log('[in_groups]' + in_groups);
    
  //var query_admin_groups = Group.find({slug : {$in: req.user.admin_groups}});
  //var query_joined_groups = Group.find({slug : {$in: req.user.joined_groups}});
  var query_schedule = Group_Schedule.find({
      discussion_time: {$gt: Date.now()},
      group_slug: {$in: in_groups}}).
    sort('discussion_time series_slug episode_number');
    
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
      
    console.log('[series_slugs]' + series_slugs);
      
    Series.find({slug: {$in: series_slugs}}).
    exec( function ( err, series ){
      if( err ) return next( err );

      var series_names = [];
        
      for (i=0; i<series.length; i++) {
        series_names[series[i].slug] = series[i].title;
      }
      console.log('[series_names]' + series_names);
        
      var monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "June", "July", "Aug", "Sep", "Oct", "Nov", "Dec"];
      var current_date;
      var current_series;
      var current_episodes = "";
      var date_cnt = 0;
      var current_schedule = new Array();
        
      for (i=0; i<schedule.length; i++) {
        var val = schedule[i];
          
        var schedule_date = monthNames[val.discussion_time.getMonth()] + ' ' + val.discussion_time.getDate() + ' ' + val.discussion_time.getFullYear() + ' ' + val.discussion_time.getHours() + 'GMT';
          
        if (typeof current_date == "undefined") {
          current_episodes = series_names[val.series_slug] + ' ' + val.episode_number;
          current_date = schedule_date;
          current_series = val.series_slug;
        } else if (current_date != schedule_date || current_series != val.series_slug) {
          current_schedule[date_cnt] = [current_date, current_episodes, val.group_slug];
          date_cnt++;
                
          current_date = schedule_date;
          current_episodes = series_names[val.series_slug] + ' ' + val.episode_number;
          current_series = val.series_slug;
        } else if (i == (schedule.length - 1)) {
          current_episodes = current_episodes + ", " + val.episode_number;
        
          current_schedule[date_cnt] = [current_date, current_episodes, val.group_slug];
        } else {
          current_episodes = current_episodes + ", " + val.episode_number;
        }
      }
        
      console.log('[current_schedule]' + current_schedule);
        
      res.render( 'user_me', {
        title       : 'My Groups',
        schedule    : current_schedule,
        series_names: series_names,
        user        : req.user
      });
    });
  });
};