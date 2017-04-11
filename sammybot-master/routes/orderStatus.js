var express = require('express');
var router = express.Router();
var http = require('http');

var host = 'ultra-esb.prod-order.esb.platform.prod.walmart.com';
var path = '/service/sams-order-services/v1/orderlookup/orderhistory';
var qs = '?profileId='; //documentSentiment,entities,language,sentences,tokens';

function performRequest(body, success, error){
    //call order api & parse response
    var payload = {};

    endpoint = path + qs + body.membershipNbr;

    headers = {
        'WM_CONSUMER.ID':'68c57674-b589-46d9-9815-46faac32e441',
        'WM_QOS.CORRELATION_ID':'100',
        'WM_SVC.ENV':'prod',
        'WM_SVC.NAME':'sams-order-services',
        'WM_SVC.VERSION':'1.0.0',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Encoding': 'identity',
        'Cache-Control': 'no-cache'

        //'Content-Length': JSON.stringify(payload).length
    };

    var options = {
        host: host,
        path: endpoint,
        method: 'GET',
        headers: headers
    };

    var req = http.request(options, function(res) {
        var responseString = '';
        var responseObject = {
            orderSummary : []
        };

        res.on('data', function(data) {
            responseString += data;
        });

        res.on('end', function() {
            console.log(responseString);

            if(JSON.parse(responseString).payload.orderSummary) {
                var orderArray = JSON.parse(responseString).payload.orderSummary ;

                if(orderArray != undefined){
                    for(var i in orderArray){
                        console.log(orderArray[i].orderNo);

                        if(orderArray[i].orderState == 'OSHIPPED'){
                            responseObject.orderSummary.push({
                                "orderNo" : orderArray[i].orderNo
                            });
                        }       
                    }
                }

                if(responseObject.orderSummary.length <= 0){
                    responseObject = JSON.parse('{"result": {"fulfillment": {"speech": "None of the orders are in shipping status. Would you like to place a new order ?"}}}');
                    success(responseObject);
                }
                else {
                    //var responseObject = JSON.parse(responseString);
                    success(responseObject);   
                }            
            } else {
                responseObject = JSON.parse('{"result": {"fulfillment": {"speech": "Unable to find Order Status"}}}');
                success(responseObject);
            }

             
        });
    });

    req.write(JSON.stringify(payload));
    req.end();
}

/* POST call */
router.post('/', function(req, res, next) {
    console.log(JSON.stringify(req.body));      
    performRequest(req.body, function(data){
        res.status(200).json(data);
        console.log(data);
    }, function(error){
        res.status(404).json("Unable to connect to service");
        console.log(error);
    })
});

exports.router = router;
exports.performRequest = performRequest;
