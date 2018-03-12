var utils    = require( '../utils' );
var mongoose = require( 'mongoose' );
var slug     = require('slug');
var User           = mongoose.model( 'User' );
var Series         = mongoose.model( 'Series' );
var Episode        = mongoose.model( 'Episode' );
var Group          = mongoose.model( 'Group' );
var Group_Schedule = mongoose.model( 'Group_Schedule' );

exports.new = function ( req, res, next ){
  req.session.login_redirect = req.originalUrl;
  if (typeof req.user == 'undefined') res.redirect('/login');
  //var user_id = req.cookies ?
    //req.cookies.user_id : undefined;

  console.log("req.user: " + JSON.stringify(req.user));
  console.log("req.cookies.user_id: " + req.cookies.user_id);
    
  res.render( 'groups_new', {
      //res.render( 'index', {
    title : 'Start a Group',
    user  : req.user
  });
};

exports.create = function ( req, res, next ){
  var group_slug = utils.uid(6) + "-" + req.body.slug;
  req.session.group_slug = group_slug;
  req.session.series_slug = req.body.slug;
   
  var start_time = Date.parse(req.body.start_date + ' ' + req.body.discussion_time);
    
  new Group({
      slug        : group_slug,
      name        : req.body.title,
      admins      : [req.user.name],
      series_slugs: [req.body.slug],
      is_active   : false,
      start_time  : start_time,
      create_time : Date.now(),
      update_time : Date.now(),
      attending_users_count: 0
  }).save( function ( err, group, count ){
    if( err ) return next( err );
      
    var time_diff = Math.abs(Date.parse(req.body.start_date) - Date.parse(req.body.end_date));
    var diff_days = Math.ceil(time_diff / (1000 * 3600 * 24)) + 1; 
      
    var episode_count = parseInt(req.body.episode_count);  
    var eps_per_day = Math.ceil(episode_count / diff_days);
           
    var start_date = Date.parse(req.body.start_date);
    var end_date = Date.parse(req.body.end_date);
    var sd = new Date(start_date);
    var ed = new Date(end_date);
      
    User.update({
        name : req.user.name
    }, { 
        $push: {admin_groups: group_slug}
    }, function (err, updated_user) {
      if( err ) return next( err );
        
      req.user.admin_groups.push(group_slug);

      res.render( 'groups_edit_schedule', {
        //res.render( 'index', {
        title      : 'Confirm the Schedule',
        series_name: req.body.title,
        series_slug: req.body.slug,
        start_date : sd,
        end_date   : ed,
        discussion_time: req.body.discussion_time,
        episode_count: episode_count,
        eps_per_day: eps_per_day,
      });
    });
    //res.redirect( '/' );
  });
};

exports.create_schedule = function ( req, res, next ){
  console.log("[discussion_time]" + req.body.discussion_time);
  console.log("[final_list]" + req.body.final_list);
    
  console.log("req.user: " + JSON.stringify(req.user));
        
  var discussion_time = req.body.discussion_time;    
  var final_list = req.body.final_list;
    
  var list_split = final_list.split(',');
  var schedule_time;
  var day_cnt = 0;
    
  for (var i = 0; i < list_split.length; i++) {
    if (list_split[i].indexOf("Episode") > -1 && day_cnt > 0) {
      var episode_number = parseInt(list_split[i].substring(8));
      new Group_Schedule({
          group_slug  : req.session.group_slug,
          series_slug : req.session.series_slug,
          episode_number: episode_number,
          discussion_time: schedule_time,
          create_time : Date.now(),
          update_time : Date.now()
      }).save( function ( err, group_schedule, count ){
        if( err ) return next( err );
      });
    } else {
      schedule_time = Date.parse(list_split[i] + " " + discussion_time);
      day_cnt++;
    }
  }
    
  res.redirect( '/groups/' + req.session.group_slug );
}

exports.detail = function( req, res, next ){
  req.session.login_redirect = req.originalUrl;
  //if (typeof req.user == 'undefined') res.redirect('/login');
 
  var query_group = Group.findOne({slug : req.params.slug});
  var query_group_schedule = Group_Schedule.find({group_slug : req.params.slug}).
    sort('discussion_time episode_number');
    
  var promise_group = query_group.exec();
  var promise_group_schedule = query_group_schedule.exec();

  promise_group.then(function (group) {
    promise_group_schedule.then(function (group_schedule) {  
        
      var monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "June", "July", "Aug", "Sep", "Oct", "Nov", "Dec"];
      var discussion_hour;
      var current_date;
      var current_episodes = "";
      var date_cnt = 0;
      var current_schedule = new Array();
        
      for (i=0; i<group_schedule.length; i++) {
        var val = group_schedule[i];
          
        var schedule_date = monthNames[val.discussion_time.getMonth()] + ' ' + val.discussion_time.getDate() + ' ' + val.discussion_time.getFullYear();
          
        if (typeof current_date == "undefined") {
          current_episodes = val.episode_number;
            
          discussion_hour = val.discussion_time.getHours();
          current_date = schedule_date;
        } else if (current_date != schedule_date) {
          current_schedule[date_cnt] = [current_date, current_episodes];
          date_cnt++;
                
          current_date = schedule_date;
          current_episodes = val.episode_number;
        } else if (i == (group_schedule.length - 1)) {
          current_episodes = current_episodes + ", " + val.episode_number;
        
          current_schedule[date_cnt] = [current_date, current_episodes];
        } else {
          current_episodes = current_episodes + ", " + val.episode_number;
        }
      }
        
      var query_series = Series.findOne({slug : group_schedule[0].series_slug});
      var promise_series = query_series.exec();
        
      promise_series.then(function (series) {
        res.render( 'groups_detail', {
          title          : group.name,
          series         : series,
          group          : group,
          group_schedule : current_schedule,
          discussion_hour: discussion_hour,
          current        : req.params.slug,
          user           : req.user
        });
      });
    });
  });
};

exports.join = function( req, res, next ){
  if (typeof req.user == 'undefined') res.redirect('/login'); 
    
  var query_group = Group.findOne({slug : req.params.slug});
  var promise_group = query_group.exec();
    
  promise_group.then(function (group) {
    var new_attending_users = group.attending_users.slice(0);
      
    if (new_attending_users.indexOf(req.user.name) == -1) {
      new_attending_users.push(req.user.name);
      
      Group.update({
          slug : req.params.slug
      }, {
          $set: { 
              attending_users: new_attending_users, 
              attending_users_count: new_attending_users.length, 
              update_time : Date.now() 
          }
      }, function (err, updated_group) {
        if( err ) return next( err );
        
        User.update({
            name : req.user.name
        }, { 
            $push: {joined_groups: group.slug}
        }, function (err, updated_user) {
          if( err ) return next( err );
        
          req.user.joined_groups.push(group.slug);
            
          res.redirect( '/groups/' + req.params.slug );
        });
      });
    } else {
      res.redirect( '/groups/' + req.params.slug );
    }
  });
}

exports.leave = function( req, res, next ){
  if (typeof req.user == 'undefined') res.redirect('/login'); 
    
  var query_group = Group.findOne({slug : req.params.slug});
  var promise_group = query_group.exec();
    
  promise_group.then(function (group) {
    var new_attending_users = group.attending_users.slice(0);
    var user_index = new_attending_users.indexOf(req.user.name);
      
    if (user_index == -1) {
      res.redirect( '/groups/' + req.params.slug );
    } else {
      new_attending_users.splice(user_index, 1);
      
      Group.update({
          slug : req.params.slug
      }, {
          $set: { 
              attending_users: new_attending_users, 
              attending_users_count: new_attending_users.length, 
              update_time : Date.now() 
          }
      }, function (err, updated_group) {
        if( err ) return next( err );
        
        User.update({
            name : req.user.name
        }, { 
            $pull: {joined_groups: group.slug}
        }, function (err, updated_user) {
          if( err ) return next( err );
        
          var group_index = req.user.joined_groups.indexOf(group.slug);
          req.user.joined_groups.splice(user_index, 1);
            
          res.redirect( '/groups/' + req.params.slug );
        });
      });
    }
  });
}

exports.ongoing = function ( req, res, next ){
  req.session.login_redirect = req.originalUrl;
    
  var query_ongoing_groups = Group.
    find({
        is_active: true,
        start_time: { $lt: Date.now() }
    }).
    sort( '-attending_users_count -update_time' );
  var promise_ongoing_groups = query_ongoing_groups.exec();

  promise_ongoing_groups.then(function (ongoing_groups) {
    res.render( 'group_list', {
      title : 'Ongoing',
      groups: ongoing_groups,
      user  : req.user
    });
  });
};

exports.upcoming = function ( req, res, next ){
  req.session.login_redirect = req.originalUrl;
    
  var query_upcoming_groups = Group.
    find({
        is_active: true,
        start_time: { $lt: Date.now() }
    }).
    sort( '-attending_users_count -update_time' );
  var promise_upcoming_groups = query_upcoming_groups.exec();

  promise_upcoming_groups.then(function (upcoming_groups) {
    res.render( 'group_list', {
      title : 'Upcoming',
      groups: upcoming_groups,
      user  : req.user
    });
  });
};
/*
exports.destroy = function ( req, res, next ){
  Group.findById( req.params.id, function ( err, group ){
    var user_id = req.cookies ?
      req.cookies.user_id : undefined;

    if( group.user_id !== user_id ){
      return utils.forbidden( res );
    }

    group.remove( function ( err, group ){
      if( err ) return next( err );

      res.redirect( '/' );
    });
  });
};

exports.edit = function( req, res, next ){
  var user_id = req.cookies ?
      req.cookies.user_id : undefined;

  Group.
    find({ user_id : user_id }).
    sort( '-updated_at' ).
    exec( function ( err, groups ){
      if( err ) return next( err );

      res.render( 'edit', {
        title   : 'Express Todo Example',
        groups   : groups,
        current : req.params.id
      });
    });
};


exports.update = function( req, res, next ){
  Todo.findById( req.params.id, function ( err, todo ){
    var user_id = req.cookies ?
      req.cookies.user_id : undefined;

    if( todo.user_id !== user_id ){
      return utils.forbidden( res );
    }

    todo.content    = req.body.content;
    todo.updated_at = Date.now();
    todo.save( function ( err, todo, count ){
      if( err ) return next( err );

      res.redirect( '/' );
    });
  });
};
*/