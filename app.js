var config         = require('./config/default.js');
var express        = require('express');
var session        = require('express-session')
var http           = require('http');
var path           = require('path');
var favicon        = require('serve-favicon');
var logger         = require('morgan');
var cookieParser   = require('cookie-parser');
var bodyParser     = require('body-parser');
var methodOverride = require('method-override');
var logger         = require('morgan');
var errorHandler   = require('errorhandler');
//var static        = require( serve-static');
var crypto         = require('crypto');
var mongoose       = require('mongoose');
var findOrCreate   = require('mongoose-find-or-create');
var passport       = require('passport');
var RedditStrategy = require('passport-reddit').Strategy;
var cron = require('node-cron');

var User    = require('./models/User');
var Todo    = require('./models/Todo');
var Series  = require('./models/Series');
var Episode = require('./models/Episode');
var Group   = require('./models/Group');
var Group_Schedule = require('./models/Group_Schedule');
var Group_Mvp = require('./models/Group_Mvp');
var Reddit_Post = require('./models/Reddit_Post');
var Reddit_Comment_User = require('./models/Reddit_Comment_User');
mongoose.connect(config.mongoose.connection);

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

passport.use(new RedditStrategy({
    clientID: config.reddit.clientID,
    clientSecret: config.reddit.clientSecret,
    //callbackURL: "http://127.0.0.1:3000/auth/reddit/callback"
    callbackURL: config.reddit.callbackURL
  },
  function(accessToken, refreshToken, profile, done) {
    process.nextTick(function () {
      User.findOrCreate({ name: profile.name, reddit_name: profile.name }, function (err, user) {
        var reddit_karma = profile.link_karma + profile.comment_karma;
        var reddit_create_time = profile._json.created;
      
        var new_is_allow_private_message;
        if (user.is_allow_private_message == false) new_is_allow_private_message = false;
        else new_is_allow_private_message = true;
          
        User.findOneAndUpdate (
            {_id: user._id}, 
            { 
                $set: { 
                    reddit_id: profile.id, 
                    reddit_karma: reddit_karma, 
                    reddit_create_time: reddit_create_time, 
                    is_allow_private_message: new_is_allow_private_message, 
                    update_time : Date.now() 
                }
            }, 
            { new: true }, 
            function (err, updated_user) {
          return done(err, updated_user);
        });
      });
    });
  }
));

var app = express();
var routes        = require('./routes');
var elasticsearch = require('./routes/elasticsearch.js');
var groups        = require('./routes/groups.js');
var group_mvp     = require('./routes/group_mvp.js');
var user          = require('./routes/user.js');
var push          = require('./routes/push.js');
var reddit_post   = require('./routes/reddit_post.js');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));

function ensureSecure(req, res, next) {
    console.log(req.protocol + process.env.PORT + '' + req.hostname + req.url);
    if(req.secure || req.hostname=='localhost'){
        //Secure request, continue to next middleware
        next();
    }else{
        res.redirect('https://' + req.hostname + req.url);
        console.log(req.protocol + process.env.PORT + '' + req.hostname + req.url);
    }
}

app.use(logger('dev'));
app.use(methodOverride());
app.use(bodyParser.json());
app.use(bodyParser.text());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

if (config.env == 'production') app.all('*', ensureSecure);
app.use(express.static(path.join(__dirname, 'public')));
app.use('/public/jquery', express.static(__dirname + '/node_modules/jquery/dist/'));
app.use('/public/bootstrap', express.static(__dirname + '/node_modules/bootstrap/dist/'));
app.use('/public/popper', express.static(__dirname + '/node_modules/popper.js/dist/'));
app.use('/public/easy-autocomplete', express.static(__dirname + '/node_modules/easy-autocomplete/dist/'));
app.use('/public/jquery-datetimepicker', express.static(__dirname + '/node_modules/jquery-datetimepicker/build/'));
app.use('/public/jquery-mousewheel', express.static(__dirname + '/node_modules/jquery-mousewheel/'));
app.use('/public/jquery-validation', express.static(__dirname + '/node_modules/jquery-validation/'));
app.use('/public/php-date-formatter', express.static(__dirname + '/node_modules/php-date-formatter/js/'));

app.use(session({
  //genid: function(req) {
  //  return genuuid() // use UUIDs for session IDs 
  //},
  genid: function(req) {
    return crypto.randomBytes(32).toString('hex') // use UUIDs for session IDs 
  },
  secret: config.session.secret,
  saveUninitialized: true,
  resave: true
}));
// Initialize Passport!  Also use passport.session() middleware, to support
// persistent login sessions (recommended).
app.use(passport.initialize());
app.use(passport.session());
//app.use('/', index);
//app.use('/users', users);

// Routes
app.use(routes.current_user);
app.get('/',                        routes.index);
app.get('/ptws',                    routes.ptws);
app.get('/about',                   routes.about);

app.get('/elasticsearch',           elasticsearch.index);

app.get('/groups/new',              groups.new);
app.post('/groups/create',          groups.create);
app.post('/groups/create_schedule', groups.create_schedule);
app.post('/groups/join/:slug',      groups.join);
app.post('/groups/leave/:slug',     groups.leave);
app.post('/groups/activate/:slug',  groups.activate);
app.post('/groups/remove/:slug',    groups.remove);
app.post('/groups/edit/:slug',      groups.edit);
app.get('/groups/ongoing',          groups.ongoing);
app.get('/groups/upcoming',         groups.upcoming);
app.get('/groups/:slug',            groups.detail);
app.get('/group_mvp/:group_slug',   group_mvp.index);
app.post('/group_mvp/:group_slug/vote/:reddit_name', group_mvp.vote);

app.get('/user/me',                 user.me);
app.get('/user/ptws',               user.ptws);
app.get('/user/settings',           user.settings);
app.post('/user/is_allow_private_message', user.is_allow_private_message);
app.post('/user/ptws/add',          user.ptws_add);
app.post('/user/ptws/remove/:slug', user.ptws_remove);

app.get('/push',                    push.index);
app.get('/push/signup',             push.signup);
app.post('/push/save_subscription', push.save_subscription);

app.get('/reddit_post/:id',         reddit_post.detail);
app.post('/reddit_post/:id/assign_to/:group_slug', reddit_post.assign_to);

app.get('/auth/reddit', function(req, res, next){
  req.session.state = crypto.randomBytes(32).toString('hex');
  passport.authenticate('reddit', {
    state: req.session.state,
    duration: 'permanent',
    scope: 'identity mysubreddits',
  })(req, res, next);
});

app.get('/auth/reddit/callback', function(req, res, next){
  // Check for origin via state token
  var redirect = (typeof req.session.login_redirect != 'undefined' && req.session.login_redirect)?req.session.login_redirect:'/';
    
  if (req.query.state == req.session.state){
    passport.authenticate('reddit', {
      successRedirect: redirect,
      failureRedirect: redirect,
      failureFlash: true
    })(req, res, next);
  }
  else {
    next( new Error(403) );
  }
});

app.get('/login', function(req, res, next) {

    res.render('login', { 
        title: 'Login',
        //user: (typeof req.user != 'undefined')?req.user:false
    });
});

app.get('/logout', function(req, res, next){
    req.logout();
    res.redirect('/');
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});


module.exports = app;

const webpush = require('web-push');

webpush.setGCMAPIKey(config.webpush.GCMAPIKey);
webpush.setVapidDetails(
  config.webpush.mailto,
  config.webpush.publicKey,
  config.webpush.privateKey
);

/*
cron.schedule('55 * * * *', function(){
  console.log('cronjob 1 day reminder');
    
  var d1 = new Date();
  var d2 = new Date();
    
  d1.setDate(d1.getDate() + 1);
  d2.setDate(d2.getDate() + 1);
  d2.setHours(d2.getHours() + 1);
    
  var query_group = Group.find({
      start_time : {$gt: d1, $lt: d2},
      is_active: true,
      attending_users_count: { $gte: 3 }
  });
  var promise_group = query_group.exec();

  promise_group.then(function (group_val) {
    for (i=0; i<group_val.length; i++) {
      var monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "June", "July", "Aug", "Sep", "Oct", "Nov", "Dec"];
      
      var payload = {
        body: monthNames[group_val[i].start_time.getUTCMonth()] + ' ' + group_val[i].start_time.getUTCDate() + ' ' + group_val[i].start_time.getUTCHours() + ':00 GMT',
        title: group_val[i].name + ' in 1 day!',
        tag: '1_day_start_notice' + Date.now()
      };    
        
      var all_users = group_val[i].admins.concat(group_val[i].attending_users);
        
      var query_user = User.find({push_subscription : {$ne: null}, name : {$in: all_users}});
      var promise_user = query_user.exec(); 
        
      promise_user.then(function (user_val) {
        for (i=0; i<user_val.length; i++) {
          var ps = JSON.parse(user_val[i].push_subscription);
            
          var pushSubscription = {
            endpoint: ps.endpoint,
            keys: {
              auth: ps.keys.auth,
              p256dh: ps.keys.p256dh
            }
          };
            
          webpush.sendNotification(pushSubscription, JSON.stringify(payload)).catch((err) => {
            if (err.statusCode === 410) {
              console.log('Push fail: ', err);
            } else {
              console.log('Subscription is no longer valid: ', err);
            }
          });
        }
      });
    }
  });
});

cron.schedule('30 * * * *', function(){
  console.log('cronjob episode 30 min reminder');
    
  var d1 = new Date();
  var d2 = new Date();
    
  d2.setHours(d2.getHours() + 1);
  var query_group_schedule = Group_Schedule.find({discussion_time : {$gt: d1, $lt: d2}});
  var promise_group_schedule = query_group_schedule.exec();

  promise_group_schedule.then(function (group_schedule_val) {
    for (i=0; i<group_schedule_val.length; i++) {
        
      var episode_number = group_schedule_val[i].episode_number;
      var discussion_hour = group_schedule_val[i].discussion_time.getUTCHours();
        
      var query_group = Group.findOne({
          slug : group_schedule_val[i].group_slug,
          is_active: true,
          attending_users_count: { $gte: 3 }
      });
      var promise_group = query_group.exec();

      promise_group.then(function (group_val) {
          
        if (group_val) {
          var monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "June", "July", "Aug", "Sep", "Oct", "Nov", "Dec"];
      
          var payload = {
            body: 'EP ' + episode_number + ' discussion starting at ' + discussion_hour + ':00 GMT',
            title: group_val.name,
            tag: 'episode_30m_notice' + Date.now()
          };    
        
          var all_users = group_val.admins.concat(group_val.attending_users);
        
          var query_user = User.find({push_subscription : {$ne: null}, name : {$in: all_users}});
          var promise_user = query_user.exec(); 
        
          promise_user.then(function (user_val) {
            for (i=0; i<user_val.length; i++) {
              var ps = JSON.parse(user_val[i].push_subscription);
            
              var pushSubscription = {
                endpoint: ps.endpoint,
                keys: {
                  auth: ps.keys.auth,
                  p256dh: ps.keys.p256dh
                }
              };
            
              webpush.sendNotification(pushSubscription, JSON.stringify(payload)).catch((err) => {
                if (err.statusCode === 410) {
                  console.log('Push fail: ', err);
                } else {
                  console.log('Subscription is no longer valid: ', err);
                }
              });
            }
          });
        }
      });
    }
  });
});
*/

cron.schedule('*/5 * * * *', function(){
  console.log('cronjob new post reminder');
    
  var query_reddit_posts = Reddit_Post.
    find({
        is_notified: false,
        group_slug: { $ne: null }
    }).
    populate('group');
  var promise_reddit_posts = query_reddit_posts.exec();

  promise_reddit_posts.then(function (reddit_posts_val) {
    for (i=0; i<reddit_posts_val.length; i++) {
        
        
      if (reddit_posts_val[i].group) {
        var monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "June", "July", "Aug", "Sep", "Oct", "Nov", "Dec"];
      
        var payload = {
          body: reddit_posts_val[i].title,
          title: "New post is live!",
          tag: 'episode_live_notice' + Date.now(),
          data: {
            url: reddit_posts_val[i].url
          }
        };    
        
        var all_users = reddit_posts_val[i].group.admins.concat(reddit_posts_val[i].group.attending_users);
        
        send_webpush_reminder(payload, all_users);
      }
    }
  });
    
  Reddit_Post.update({
      is_notified: false,
      group_slug: { $ne: null }
  }, {
      $set: { 
          is_notified: true,
          update_time : Date.now() 
      }
  }, {
      multi: true
  }, function (err, updated_reddit_post) {
    if( err ) return next( err );
  });
    
  function send_webpush_reminder(payload, all_users) {
      
    var query_user = User.find({push_subscription : {$ne: null}, name : {$in: all_users}});
    var promise_user = query_user.exec(); 
      
    promise_user.then(function (user_val) {
      for (ii=0; ii<user_val.length; ii++) {
        var ps = JSON.parse(user_val[ii].push_subscription);
            
        var pushSubscription = {
          endpoint: ps.endpoint,
          keys: {
            auth: ps.keys.auth,
            p256dh: ps.keys.p256dh
          }
        };
            
        webpush.sendNotification(pushSubscription, JSON.stringify(payload)).catch((err) => {
          if (err.statusCode === 410) {
            console.log('Push fail: ', err);
            //return deleteSubscriptionFromDatabase(subscription._id);
          } else {
            console.log('Subscription is no longer valid: ', err);
          }
        });
      }
    });
  }
});