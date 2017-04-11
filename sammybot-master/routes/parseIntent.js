var express = require('express');
var router = express.Router();
var apiai = require('apiai');
var orderStatus = require('./orderStatus');
 
var app = apiai("3cc2f72cdf874994abb8b9ddeb221a4a");
var sId = '';

function generate_sessionid() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
    s4() + '-' + s4() + s4() + s4();
}

function performRequest(body, success, error){
    if(sId == '') {
        sId = generate_sessionid();
    }

    var request = app.textRequest(body.content, {
        sessionId: sId
    });
 
    request.on('response', function(response) {
        //console.log(response);

        var responsedata = response;
        var isOrderContext = false;
        
        if(response.result && response.result.contexts){
            for (var i=0; i<response.result['contexts'].length; i++){
                if(response.result.contexts[0].name == 'order'){
                    isOrderContext = true;
                }
            }
        } 
        if(isOrderContext == true){
            var body = {"membershipNbr" : "4613091860"}
            orderStatus.performRequest(body, function(data){
                success(data);
                //break;
            });
        } else {
            success(responsedata);
        }
    });
 
    request.on('error', function(error) {
        console.log(error);
    });
 
    request.end();
}

/* POST call */
router.post('/', function(req, res, next) {
    console.log(JSON.stringify(req.body));      
    performRequest(req.body, function(data){
        var responsedata = data;
        if(data.orderSummary && data.orderSummary.length > 0){
            var date = new Date();
            var newDate = new Date(date.setTime( date.getTime() + 7 * 86400000 ));
            stagingdata = "Order Number : " +   data.orderSummary[0].orderNo + " is in process of getting shipped. It will arrive by " + newDate;

            responsedata = JSON.parse('{"result": {"fulfillment": {"speech": "' + stagingdata + '"}}}');
        }
        res.status(200).json(responsedata);
        console.log(data);
    }, function(error){
        res.status(404).json("Unable to connect to service");
        console.log(error);
    })
});

module.exports = router;
