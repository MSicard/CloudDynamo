// Modules
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var stemmer = require('porter-stemmer').stemmer;
var async = require('async');

//Own Modules
var dynamoDbTable = require('./keyvaluestore.js');

// Express
var app = express();


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');


app.use(logger('dev'));

app.use(function (req, res, next) {
  res.setHeader("Cache-Control", "no-cache must-revalidate");
  next();
});

app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.get('/', function (req, res, next) {
  res.render('index', { title: 'Express' });
});

app.get('/search/:word', function (req, res) {
  var stemmedword = stemmer(req.params.word).toLowerCase(); //stem the word
  console.log("Stemmed word: " + stemmedword);

  var imageurls = new Array();

  var processData = function (callback) {
    terms.query(stemmedword, function (err, data) {
      if (err) {
        console.log("getAttributes() failed: " + err);
        callback(err.toString(), imageurls);
      } else if (data == null) {
        console.log("getAttributes() returned no results");
        callback(undefined, imageurls);
      } else {
        async.forEach(data, function (attribute, callback) {
          images.get(attribute.value, attribute.inx, function (err, data) {
            if (err) {
              console.log(err);
            }
            imageurls.push(data[0].value);
            callback(undefined, imageurls);
          });
        }, function () {
          callback(undefined, imageurls);
        });
      }
    });
  };

  processData(function (err, queryresults) {
    if (err) {
      res.send(JSON.stringify({ results: undefined, num_results: 0, error: err }));
    } else {
      res.send(JSON.stringify({ results: queryresults, num_results: queryresults.length, error: undefined }));
    }
  });
});

//INIT Logic
var images = new dynamoDbTable('Images');
var terms = new dynamoDbTable('Labels');

images.init(
  function () {
    terms.init(
      function () {
        console.log("Images Storage Starter");
      }
    )
    console.log("Terms Storage Starter");
  }
);

module.exports = app;
