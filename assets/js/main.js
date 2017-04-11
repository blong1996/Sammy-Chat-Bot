/**
 * Created by brandonlong on 3/14/17.
 */


var intent,
    action,
    parameters,
    spokenResponse;

var today = new Date;
var correctToday = today.toLocaleTimeString()+" "+ today.toDateString() ;
var accessToken = "5631d749279e4ebdac29dc041038360d",
    baseUrl = "https://api.api.ai/v1/",
    wmBaseUrl = "http://www.samsclub.com/soa/services/v1",
    $speechInput,
    $recBtn,
    $userID,
    recognition,
    messageRecording = "Recording...",
    messageCouldntHear = "I couldn't hear you, could you say that again?",
    messageInternalError = "Oh no, there has been an internal server error",
    messageSorry = "I'm sorry, I don't have the answer to that yet but I will use that request to learn more and be prepared for future requested similar to it.";
$(document).ready(function() {
    $speechInput = $("#btn-input");
    //$recBtn = $("#btn-chat");


    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
            $userID = user.uid;
        } else {
            $userID = makeid();
        }
    });



    $speechInput.keypress(function(event) {
        if (event.which == 13) {
            event.preventDefault();
            send();
        }
    });
    //$recBtn.on("click", function(event) {
        //switchRecognition();
    //});
    $(".debug__btn").on("click", function() {
        $(this).next().toggleClass("is-active");
        return false;
    });
});

/**
 *
 * Randomly generates an ID for the current Sammy interaction when there is
 * no auth user
 * @returns text : the random user ID
 *
 */
function makeid()
{
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for( var i=0; i < 5; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}

/**
 *
 * startRecognition() allows the user to speak their message aloud and
 * converts it to text
 *
 */
function startRecognition() {
    recognition = new webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onstart = function(event) {
        respond(messageRecording);
        updateRec();
    };
    recognition.onresult = function(event) {
        recognition.onend = null;

        var text = "";
        for (var i = event.resultIndex; i < event.results.length; ++i) {
            text += event.results[i][0].transcript;
        }
        setInput(text);

        stopRecognition();
    };
    recognition.onend = function() {
        respond(messageCouldntHear);
        stopRecognition();
    };
    recognition.lang = "en-US";
    recognition.start();
}

/**
 *
 * stopRecognition() stops the speech recognition
 *
 */

function stopRecognition() {
    if (recognition) {
        recognition.stop();
        recognition = null;
    }
    updateRec();
}

/**
 *
 * swtichRecognition() toggles the speech recognition methods
 *
 */
function switchRecognition() {
    if (recognition) {
        stopRecognition();
    } else {
        startRecognition();
    }
}

/**
 *
 * setInput() sets $speeachInput equal to the message given by the user
 * and then calls send()
 *
 * @param text message provided by user
 */
function setInput(text) {
    $speechInput.val(text);
    send();
}

/**
 *
 * updateRec() toggles the text on the record button between "Stop" and "Speak"
 *
 */
function updateRec() {
    $recBtn.text(recognition ? "Stop" : "Speak");
}

/**
 *
 * send() takes the user's message, creates a message block in the chat window,
 * and makes the POST to API.AI
 *
 */
function send() {


    var appendHTML = "<li class='right clearfix'><span class='chat-img pull-right'>"+
        "<img src='http://placehold.it/50/FA6F57/fff&amp;text=ME' alt='User Avatar' class='img-circle'>"+
        "</span>"+
        "<div class='chat-body clearfix'>"+
        "<div class='header'>"+
        "<small class=' text-muted'><span class='glyphicon glyphicon-time'></span>"+
        correctToday+
        "</small>"+
        "<strong class='pull-right primary-font'>Me</strong>"+
        "</div>"+
        "<p>"+
        $speechInput.val()+
        "</p>"+
        "</div>"+
        "</li>";


    var text = $speechInput.val();
    $('#convo').append(appendHTML);
    $('input[type="text"]').val('');
    scrollToBottom();
    $.ajax({
        type: "POST",
        url: baseUrl + "query",
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        headers: {
            "Authorization": "Bearer " + accessToken
        },
        data: JSON.stringify({query: text, lang: "en", sessionId: $userID}),
        success: function(data) {
            prepareResponse(data);
        },
        error: function() {
            respond(messageInternalError);
        }
    });
}


/**
 *
 * prepareResponse() takes the JSON from API.AI and uses it to get the correct
 * textual response to be made by Sammy
 *
 * @param val JSON returned by API.AI
 *
 */
function prepareResponse(val) {
    var debugJSON = JSON.stringify(val, undefined, 2);
        spokenResponse = val.result.speech;
    //respond(spokenResponse);
    debugRespond(debugJSON);
    console.log(val.result);

    action = val.result.action;

    if (action) {
        firebase.auth().onAuthStateChanged(function(user) {
            if (user) {
                 determineAction(val, user);
               // respond(spokenResponse);
            }
        });
    } else {
        respond(spokenResponse);
    }

}

/**
 *
 * writeUserData() updates users displayName and email address
 * in the Firebase database
 *
 * @param userId current auth user's uid
 * @param name current auth user's displayName
 * @param email current auth user's email
 *
 */
function writeUserData(userId, name, email) {
    firebase.database().ref('Users/' + userId).set({
        displayName: name,
        email: email
    });
}

/**
 *
 *  createNewUser() is used to add new authenticated users to the Firebase
 *  database
 *
 */
function createNewUser() {

    var updates = {};

    firebase.auth().onAuthStateChanged(function(user) {
        // A user
        var userData = {
            email: user.email,
            uid: user.uid,
        };
        updates['/Users/' + user.uid] = userData;
    });

    // Write the new user's data

    firebase.database().ref().update(updates);
}

/**
 *
 *  determineAction() utlilizes its parametes to make calls to the correct
 *  function based on the action in the JSON returned form API.AI
 *
 * @param val : object returned from API.AI
 * @param user : current authenticated Firebase user
 *
 */
function determineAction(val, user) {

        // set display name for current user
    if (action == "save.username") {
        setDisplayName(val, user);
        respond(spokenResponse);
    }
        // get display name for current user
    else if (action == "display.username") {
        getDisplayName(user);
        respond(spokenResponse);
    }
        // create new shopping list for current user
    else if (action == "create.shopping.list") {
        createShoppingList(val, user);
        respond(spokenResponse);
    }
        // retreive current active list for user
    else if (action == "current.list") {
        getCurrentList(user);
        respond(spokenResponse);
    }

        // add new item to current list
    else if (action == "add.to.list") {
        addToCurrentList(val, user);
        respond(spokenResponse);
    }
        // personalize greeting message
    else if (action == "input.welcome") {
        welcome(user);
        respond(spokenResponse);
    }
        // create an order using user's current list
    else if(action == "order.current.list")
        createOrder(user);
        // submit current order
    else if (action == "submit.current.order")
        submitOrder();



}

/**
 *  createOrder() is used to create a new order from the current shopping list
 *
 * @param user
 */
function createOrder(user) {

    var total = 0.00;
    var currentList;
    firebase.database().ref('/Users/' + user.uid+'/currentList/')
        .once('value').then(function(snapshot) {
        currentList = snapshot.val();


        // Create a key for order
        var newOrderKey = firebase.database().ref().child('Users/' +
            user.uid + '/orders/').push().key;


        console.log(currentList['items']);
        var items = currentList['items'];
        spokenResponse ="Your order currently includes </br></br>";
        for (var itemKey in items) {

            var item  = items[itemKey];
            console.log(item);
            spokenResponse += item['quantity'] +" "+ item['product']+" - $ "+item['price']+" each</br>";
            total += item['price']*item['quantity'];

        }
        console.log(currentList);
            total+= (total*0.045);
            // order object to be added to orders
            var newOrder = {
                total: total,
                list: currentList,
                orderId: newOrderKey
            };
            console.log(newOrder);


            var updates = {};
            // add new order to users' orders
            updates['/Users/' + user.uid + '/orders/'+newOrderKey] = newOrder;

            // set users' current order to this new order
            updates['Users/' + user.uid + '/currentOrder/'] = newOrder;
            firebase.database().ref().update(updates);

        spokenResponse+="</br>Your order total, including tax is "+format(total, "$")+" Would you like me " +
            "to submit this order using your default credit card?";
       // console.log(spokenResponse);
        respond(spokenResponse);
    });

}

/**
 *
 *  submitOrder() completes the current order
 *
*/
function submitOrder() {
        spokenResponse="Your order has been placed. It will be ready for pickup " +
            "at the Bentonville Club after 7:20 PM";
        respond(spokenResponse);
}

/**
 *
 * convert decimal to currency
 *
 * @param n
 * @param currency
 * @returns {string}
 */
function format(n, currency) {
    return currency + " " + n.toFixed(2).replace(/(\d)(?=(\d{3})+\.)/g, "$1,");
}

/**
 * welcome() displays a personalized welcome message for the user
 *
 * @param user
 */
function welcome(user) {
    if (user.displayName) {
        console.log(user.displayName);
        spokenResponse = "Hey " + user.displayName + "! How can I assist you today? You " +
            "can say something like \"Create a shopping list.\"";
    }
}

/**
 *
 * setDisplayName() sets the display name for the current auth user
 *
 * @param val : object returned from API.AI
 * @param user : current authenticated Firebase user
 */
function setDisplayName(val, user) {
    parameters = val.result.parameters;
    console.log("Here");

    user.updateProfile({
        displayName:  parameters['given-name']
    });
    var updates = {};

    updates['/Users/' + user.uid + '/displayName'] = parameters['given-name'];

    firebase.database().ref().update(updates);

    var userId = firebase.auth().currentUser.uid;
    firebase.database().ref('/Users/' + userId).once('value').then(function(snapshot) {
        var user2 = snapshot.val();
        console.log("Firebase Snapshot: ");
        console.log(user2)
    });

    console.log("API.AI Auth User: ");
    console.log(user);
    console.log("API.AI Paramaters: ");
    console.log(parameters);
    console.log("API.AI Given Name: "+ parameters['given-name']);
}

/**
 *
 * getDisplayName() gets the displayName for the current auth user and
 * generates the appropriate response for the
 *
 * @param user : current authenticated Firebase user
 */
function getDisplayName(user) {
    if (user.displayName) {
        console.log(user.displayName);
        spokenResponse =  "Your name is " + user.displayName;
    }
    else
        spokenResponse = "I don't believe you have told me your name yet, what is it?";
}

/**
 *
 * createShoppingList() creates a new shopping list for current
 * user
 *
 * @param val : object returned from API.AI
 * @param user : current authenticated Firebase user
 */
function createShoppingList(val, user) {
    parameters = val.result.parameters;

    if (parameters['list-name']) {

            // Create a key for shopping list
        var newListKey = firebase.database().ref().child('Users/' + user.uid + '/shoppingLists/').push().key;
            // new shopping list
        var newList = {
            uid: user.uid,
            itemCount: 0,
            listName: parameters['list-name'],
            listId: newListKey
        };
            // variable to simultaneously add the new list in two locations
        var updates = {};
            // add new list to users' shopping lists
        updates['/Users/' + user.uid + '/shoppingLists/' + newListKey] = newList;
         // set users' current shopping list to this new list
        updates['Users/' + user.uid + '/currentList/'] = newList;

        firebase.database().ref().update(updates);
    }
}

/**
 *
 * getCurrentList() retrieves the current list for the current user
 *
 * @param user : current authenticated Firebase user
 */
function getCurrentList(user) {


    firebase.database().ref('/Users/' + user.uid).once('value').then(function(snapshot) {
        var user2 = snapshot.val();
        console.log(user2['currentList']);
        if (user2['currentList']) {
            console.log(user2['currentList']['listName']);
            spokenResponse =  "You are currently working on your shopping list called: "
                + user2['currentList']['listName'];
            console.log(spokenResponse);

        }
        else
            spokenResponse = "You do not have any shopping lists currently";

    });



}
/**
 *
 *  addToCurrentList() adds items to current shopping list
 *
 * @param val
 * @param user
 */
function addToCurrentList(val, user) {
    var listId;
    var price = 0;
    firebase.database().ref('/Users/' + user.uid+'/currentList/' +
        'listId').once('value').then(function(snapshot) {
        listId = snapshot.val();
        console.log(listId);
        var product = parameters['product'];
        parameters = val.result.parameters;

        if ( parameters['quantity']) {

            // hard coded prices for demo products
            if(product == "Nature's Own Honey Wheat Bread (2 Pack)")
                price = 4.58;
            else if (product == "Organic Bananas (3 lbs.)")
                price = 1.84;
            else if (product == "Organic Brown Eggs (24 ct.)")
                price = 5.98;
            else if (product == "Silk Almond Milk, Unsweetened Vanilla (64 oz., 3 pk.)")
                price = 7.98;
            else if (product == "Post Honey Bunches of Oats with Crispy Almonds (48 oz.)")
                price = 6.28;


            // item object to be added to shoppinglist
            var newItem = {
                product: parameters['product'],
                quantity: parseInt(parameters['quantity']),
                price: price
            };
            // Create a key for item
            var newItemKey = firebase.database().ref().child('Users/' +
                user.uid + '/currentList/items/').push().key;

            var updates = {};
            // add new item to users' current list
            updates['/Users/' + user.uid + '/shoppingLists/' + listId +'/items/'+ newItemKey] = newItem;

            // set users' current shopping list to this new list
            updates['Users/' + user.uid + '/currentList/items/' + newItemKey] = newItem;
            firebase.database().ref().update(updates);
        }
    });



}

/**
 *
 * debugRespond() fills in the JSON Response window on the html page
 *
 * @param val : JSON returned by API.AI request
 *
 */
function debugRespond(val) {
    $("#response").text(val);
}

/**
 *
 * respond() displays Sammy's response in the chat window
 *
 * @param val : response made by Sammy
 */
function respond(val) {
    if (val == "") {
        val = messageSorry;
    }
    if (val !== messageRecording) {
        var msg = new SpeechSynthesisUtterance();
        msg.voiceURI = "native";
        msg.text = val;
        msg.lang = "en-US";
        window.speechSynthesis.speak(msg);
    }

        // HTML to format response as message in chat

    var sammyTextSpeech = "<li class='left clearfix'><span class='chat-img pull-left'>"+
        "<img src='http://placehold.it/50/55C1E7/fff&amp;text=S' alt='User Avatar' class='img-circle'>"+
        "</span>"+
        "<div class='chat-body clearfix'>"+
        "<div class='header'>"+
        "<strong class='primary-font'>Sammy</strong> <small class='pull-right text-muted'>"+
        "<span class='glyphicon glyphicon-time'></span>"+
        correctToday+
        "</small>"+
        "</div>"+
        "<p>"+
        val+
        "</p>"+
        "</div>"+
        "</li>";

    $('#convo').append(sammyTextSpeech);
    scrollToBottom();
    $("#spokenResponse").addClass("is-active").find(".spoken-response__text").html(val);
}

/**
 *
 *  scrollToBottm() keeps the chat window scrolled down to the latest message sent
 *
 */
function scrollToBottom() {
    $('.panel-body').scrollTop($('.panel-body')[0].scrollHeight);
}

/**
 *
 *  function for the "remember Me" button.
 *
 */
$(function(){
    $('.button-checkbox').each(function(){
        var $widget = $(this),
            $button = $widget.find('button'),
            $checkbox = $widget.find('input:checkbox'),
            color = $button.data('color'),
            settings = {
                on: {
                    icon: 'glyphicon glyphicon-check'
                },
                off: {
                    icon: 'glyphicon glyphicon-unchecked'
                }
            };

        $button.on('click', function () {
            $checkbox.prop('checked', !$checkbox.is(':checked'));
            $checkbox.triggerHandler('change');
            updateDisplay();
        });

        $checkbox.on('change', function () {
            updateDisplay();
        });

        function updateDisplay() {
            var isChecked = $checkbox.is(':checked');
            // Set the button's state
            $button.data('state', (isChecked) ? "on" : "off");

            // Set the button's icon
            $button.find('.state-icon')
                .removeClass()
                .addClass('state-icon ' + settings[$button.data('state')].icon);

            // Update the button's color
            if (isChecked) {
                $button
                    .removeClass('btn-default')
                    .addClass('btn-' + color + ' active');
            }
            else
            {
                $button
                    .removeClass('btn-' + color + ' active')
                    .addClass('btn-default');
            }
        }
        function init() {
            updateDisplay();
            // Inject the icon if applicable
            if ($button.find('.state-icon').length == 0) {
                $button.prepend('<i class="state-icon ' + settings[$button.data('state')].icon + '"></i> ');
            }
        }
        init();
    });
});