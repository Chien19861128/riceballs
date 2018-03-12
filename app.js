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

var User    = require('./models/User');
var Todo    = require('./models/Todo');
var Series  = require('./models/Series');
var Episode = require('./models/Episode');
var Group   = require('./models/Group');
var Group_Schedule = require('./models/Group_Schedule');
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
      User.findOrCreate({ name: profile.name, reddit_id: profile.id, reddit_name: profile.name }, function (err, user) {
        var reddit_karma = profile.link_karma + profile.comment_karma;
        var reddit_create_time = profile._json.created;
      
        User.findOneAndUpdate ({_id: user._id}, { $set: { reddit_karma: reddit_karma, reddit_create_time: reddit_create_time, update_time : Date.now() }}, { new: true }, function (err, updated_user) {
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
var user          = require('./routes/user.js');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(methodOverride());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/public/jquery', express.static(__dirname + '/node_modules/jquery/dist/'));
app.use('/public/bootstrap', express.static(__dirname + '/node_modules/bootstrap/dist/'));
app.use('/public/popper', express.static(__dirname + '/node_modules/popper.js/dist/'));
app.use('/public/easy-autocomplete', express.static(__dirname + '/node_modules/easy-autocomplete/dist/'));
app.use('/public/jquery-datetimepicker', express.static(__dirname + '/node_modules/jquery-datetimepicker/build/'));
app.use('/public/jquery-mousewheel', express.static(__dirname + '/node_modules/jquery-mousewheel/'));
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
app.get('/',            routes.index);

app.get('/elasticsearch',     elasticsearch.index);

app.get('/groups/new',              groups.new);
app.get('/groups/:slug',            groups.detail);
app.post('/groups/create',          groups.create);
app.post('/groups/create_schedule', groups.create_schedule);
app.post('/groups/join/:slug',      groups.join);
app.post('/groups/leave/:slug',     groups.leave);
app.get('/groups/ongoing',          groups.ongoing);
app.get('/groups/upcoming',         groups.upcoming);
app.get('/user/me',                 user.me);

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
        user: (typeof req.user != 'undefined')?req.user:false
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