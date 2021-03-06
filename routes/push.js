var config   = require('../config/default.js');
var utils    = require('../utils');
var mongoose = require('mongoose');
var User     = mongoose.model( 'User' );

exports.signup = function ( req, res, next ){
    
  res.render( 'push_signup', {
    title : 'Signup for Notifications'
    //user  : req.user
  });
}

exports.index = function ( req, res, next ){
    
  const webpush = require('web-push');

  // VAPID keys should only be generated only once.
  //const vapidKeys = webpush.generateVAPIDKeys();

  //console.log('[vapidKeys]' + vapidKeys);    
    
  webpush.setGCMAPIKey(config.webpush.GCMAPIKey);
  webpush.setVapidDetails(
    config.webpush.mailto,
    config.webpush.publicKey,
    config.webpush.privateKey
  );

  // This is the same output of calling JSON.stringify on a PushSubscription

  var payload = {
          body: Date.now(),
          title: 'title',
          tag: 'tag'
        };   
    
  var query_user = User.find({push_subscription : {$ne: null}, name : req.user.name});
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
                //return deleteSubscriptionFromDatabase(subscription._id);
        } else {
          console.log('Subscription is no longer valid: ', err);
        }
      });
    }
  });
};

const isValidSaveRequest = (req, res) => {
  // Check the request body has at least an endpoint.
      console.log('[isValidSaveRequest]' + req.body);
  if (!req.body || !req.body.endpoint) {
    // Not a valid subscription.
    res.status(400);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({
      error: {
        id: 'no-endpoint',
        message: 'Subscription must have an endpoint.'
      }
    }));
      
    return false;
  }
  return true;
};

exports.save_subscription = function ( req, res, next ){
  if (!isValidSaveRequest(req, res)) {
    return;
  }

  return saveSubscriptionToDatabase(req.body, req.user.name)
  .then(function(subscriptionId) {
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({ data: { success: true } }));
  })
  .catch(function(err) {
    res.status(500);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({
      error: {
        id: 'unable-to-save-subscription',
        message: 'The subscription was received but we were unable to save it to our database.'
      }
    }));
  });
};

function saveSubscriptionToDatabase(subscription, username) {
  return new Promise(function(resolve, reject) {
    User.findOneAndUpdate (
        {name : username}, 
        {$set: { push_subscription: JSON.stringify(subscription), update_time : Date.now()}}, 
        {new: true}, 
    function (err, updated_user) {
      if (err) {
        reject(err);
        return;
      }

      resolve(updated_user.name);
    });
  });
};
//Public Key:
//BIBjePfp_KD20kphPJXGgQ-XO2OlJ1IP2RT_64SighWtxfZFjM0CLP4sjYqZpgeGPmfIGDgGH2MpHDWudtD1HE0

//Private Key:
//tBGPPqPx565rLDnybmbxVkxd7dpr4KmmVwm2rWiwBjU