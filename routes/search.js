var stemmer = require('porter-stemmer').stemmer;

var express = require('express');
var router = express.Router();

router.get('/', function(req, res) {
  console.log("Argumento: "+req.params.word);
  var stemmedword = stemmer(req.params.word).toLowerCase(); //stem the word
  console.log("Stemmed word: "+stemmedword);
  
  // define an array to store the final set of results returned from DynamoDB
  var imageurls = new Array(); 
  
  var processData = function(callback) {
    terms.get(stemmedword, function(err, data) {
      if (err) {
        console.log("getAttributes() failed: "+err);
        callback(err.toString(), imageurls);
      } else if (data == null) {
        console.log("getAttributes() returned no results");
        callback(undefined, imageurls);
      } else {
        // The reason why I have used the Async module is because Node is asynchronous 
        // in nature and therefore if you simply run a nested for-loop where you 
        // try to add the results of the second DynamoDB query to an array you won't 
        // be able to block/wait till the last loop iteration is complete because 
        // there is no concept of blocking in Node or at least we should not use 
        // any blocking methods. Therefore, the Async module provides a clean 
        // abstraction to allow you to provide a callback that gets called when the 
        // iterator of the forEach loop defined below reaches its end and this 
        // callback is defined as the third argument to the async.forEach function 
        // (where the first is the data-structure being looped over and the second 
        // is the function that you want to run on the current element (i.e element 
        // at the current position of the iterator) and and you pass a reference to 
        // the callback that will be called when the iterator is done as a paramter 
        // to this function). 
        //
        // One GOTCHA is that YOU MUST CALL THE GIVEN CALLBACK for every iteration of 
        // the forEach loop which means if you call callback() from within an if 
        // statement then you must also call callback from the else statement that 
        // goes with that if statement (for an example look below) which means that 
        // even if you haven't defined an else statement because you didn't need one 
        // initially you will still have to define one for calling the callback. 
        // Also, you must ensure that you don't call the callback() twice otherwise 
        // there will be an error thrown.
        
        console.log("getAttributes() returned");
  	    async.forEach(data, function(attribute, callback) { 
            console.log(attribute);
            images.get(attribute.value, function(err, data){
              if (err) {
                console.log(err);
              }
              imageurls.push(data[0].value);
              callback();
            });
          }, function(){
            callback(undefined, imageurls);
        });
     }
    });
  };

  processData(function(err, queryresults) {
    if (err) {
      res.send(JSON.stringify({results: undefined, num_results: 0, error: err}));
    } else {
      res.send(JSON.stringify({results: queryresults, num_results: queryresults.length, error: undefined}));
    }
  });
});

module.exports = router;
