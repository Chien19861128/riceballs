var config = require('./config/default.js'),
    mongoose = require('mongoose'),
    fs = require('fs'),
    xml2js = require('xml2js'),
	util = require("util"),
	http = require('http'),
	https = require('https'),
	slug = require('slug'),
	async = require('async'),
    request = require('request'),
    url = require('url'),
    path = require('path');

var Todo    = require('./models/Todo');
var Series  = require('./models/Series');
var Episode = require('./models/Episode');
mongoose.connect(config.mongoose.connection);
//var uri = 'mongodb://localhost:27017/riceballs';
//var db_options = { promiseLibrary: require('bluebird') };
//var db = mongoose.createConnection(uri, db_options);

var i = config.fetch_ann.start;

Series.remove({ ann_id: {$gte: config.fetch_ann.start} }, function (err) {
  if (err) return console.log(err);
    
  Episode.remove({ ann_id: {$gte: config.fetch_ann.start} }, function (err) {
    if (err) return console.log(err);

    async.whilst(
        function () { return i < config.fetch_ann.end; },
        function (cb) {
            var id_str = "";
            for(var ii=i; ii<i+50; ii++) {
                if (id_str=="") {
                    id_str = ii;
                } else if (ii == 870) {
                } else {
                    id_str = id_str + "/" + ii;
                }
                
                if (ii >= config.fetch_ann.end && ii == (i+49)) {
                    console.log('[done]');
                }
            }

            i+=50;

            //console.log("[i]" + i);
            var options = {
                host: 'cdn.animenewsnetwork.com',
                path: '/encyclopedia/api.xml?anime=' + id_str
            };

            callback = function(response) {
                var str = '';

                //another chunk of data has been recieved, so append it to `str`
                response.on('data', function (chunk) {
                    str += chunk;
                });

                //the whole response has been recieved, so we just print it out here
                response.on('end', function () {

                    var parseString = require('xml2js').parseString;

                    parseString(str, function (err, result) {

                        if (result && result['ann']['anime']) {
                            result['ann']['anime'].forEach(function(element, index, arr) {

                                //console.log(element['$']['name']);
                                var id = parseInt(element['$']['id']);
                                var title = element['$']['name'];
                                var title2 = '';
                                var title3 = '';
                                var title4 = '';
                                var title5 = '';
                                var slug_value;
                                var type = element['$']['type'];
                                var image;
                                var description;
                                var episode_count=1;
                                var length=0;
                                var vintage='';
                                var pic_url='';

                                var official_tags = [];

                                if (element['info']) {
                                    element['info'].forEach(function(element2, index2, arr2) {
                                        switch(element2['$']['type']) {
                                            case 'Genres':
                                                official_tags.push('genre:' + element2['_']);
                                                break;
                                            case 'Themes':
                                                official_tags.push('theme:' + element2['_']);
                                                break;
                                            case 'Alternative title':
                                                if (element2['$']['lang'] && 'ja'==element2['$']['lang'].toLowerCase()) {
                                                    if (title2 == '') {
                                                        title2=element2['_'];
                                                    } else if (title3 == '') {
                                                        title3=element2['_'];
                                                    } else if (title4 == '') {
                                                        title4=element2['_'];
                                                    } else {
                                                        title5=element2['_'];
                                                    }
                                                }
                                                break;
                                            case 'Plot Summary':
                                                description=element2['_'];
                                                break;
                                            case 'Number of episodes':
                                                episode_count=parseInt(element2['_']);
                                                break;
                                            case 'Running time':
                                                if (element2['_'] && 'half hour'==element2['_'].toLowerCase()) {
                                                    length=30;
                                                } else if (element2['_'] &&'one hour'==element2['_'].toLowerCase()) {
                                                    length=60;
                                                } else {
                                                    length=parseInt(element2['_']);
                                                }
                                                break;
                                            case 'Vintage':
                                                vintage=element2['_'];
                                                break;
                                            case 'Picture':
                                                pic_url=element2['$']['src'];
                                                break;
                                        }
                                    });
                                }
                                
                                if (episode_count == 1 && element['episode'] && element['episode'].length > 1) episode_count=element['episode'].length;
                                
                                slug_value=slug(element['$']['name'] + '-' + vintage.substring(0, 10));

                                new Series({
                                    slug: slug_value,
                                    ann_id: id,
                                    title: title, 
                                    title2: title2, 
                                    title3: title3, 
                                    title4: title4,
                                    title5: title5,
                                    type: type, 
                                    description: description, 
                                    episode_count: episode_count, 
                                    length: length, 
                                    vintage: vintage, 
                                    official_tags: official_tags 
                                }).save( function ( err, series, count ){
                                  if( err ) return next( err );
                                });

                                if (element['episode']) {
                                    element['episode'].forEach(function(element2, index2, arr2) {
                                        var episode_number = parseFloat(element2['$']['num']);
                                        var episode_title = element2['title'][0]['_'];

                                        if (episode_number > -1) {
                                          new Episode({
                                              series_slug: slug_value,
                                              ann_id: id,
                                              number: episode_number,
                                              title: episode_title
                                          }).save( function ( err, episode, count ){
                                            if( err ) console.log(err)//return next( err );
                                          });
                                        }
                                    });
                                }

                                //var pic_q = url.parse(pic_url, true);
                                if (pic_url) {
                                  setTimeout(function ( err ){
                                    if( err ) return next( err );

                                    var pic_url_p = url.parse(pic_url);
                                    var pic_https = 'https://' + pic_url_p.host + pic_url_p.pathname;

                                    try {
                                      var download = function(uri, filename, callback){
                                        request.head(uri, function(err, res, body){
                                          //console.log('content-type:', res.headers['content-type']);
                                          //console.log('content-length:', res.headers['content-length']);

                                          request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
                                        });
                                      };

                                      var extname = path.extname(pic_url);

                                      download(pic_https, 'public/images/cover/' + slug_value + extname, function(er){
                                         if( er ) console.log('[download_pic]' + er);//return next( er );
                                      });

                                    } catch (err) {
                                      console.error('[Error][' + slug_value + ']', err.stack);
                                    }
                                  }, 1500);
                                }
                            });
                        } else {
                            console.log("[err]" + id_str);
                        }
                    });
                });
            }

            const req = https.request(options, callback);
            
            req.on('error', (e) => {
              console.error('[request]' + e);
            });
            
            req.end();
            
            setTimeout(cb, 3500);
        },
        function (err) {
            if (err) console.log('[err]' + err);
        }
    );
  });
});
