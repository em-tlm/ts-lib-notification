/* node modules */
var Q           = require('q');

/* our modules */
var NotificationFormatter = require('./NotificationFormatter');
var NotificationHelper    = require('./NotificationHelper');
var NotificationLogger    = require('./NotificationLogger');

/*
* To create a Notification
* must have: user, method (text,email or call) and type
* type includes: sensor-trigger, two-factor and etc
* fromEmail is optional, if set, email will be sent using that, instead of config.email.ts
*
*
* Add whatever you need to the spec obj
*/
function Notification(spec) {
    // copy the spec obj over
    // required: user, method, type
    // optional: device trigger, feed, datapoint, twoFactorCode, fromEmail and anything else

    this.decorate(spec);
}

/*
* Decorate the notification with extra specification
* */
Notification.prototype.decorate = function (extraSpec) {

    for (var key in extraSpec) {
        if (extraSpec.hasOwnProperty(key)) {
            this[key] = extraSpec[key];
        }
    }
};

/* send out the notification
*  returns a promise chain that resolves to nothing important
*  */
Notification.prototype.send = function () {

    return Q(this)
        .then(NotificationLogger.logEvent) // record the send-notification event if needed
        .then(NotificationFormatter.formatBody) // get the notification body
        .then(this.deliverCenter[this.method]) // send out the notification
        .then(NotificationLogger.logDispatch) // log notification status from deliver center method
        .catch(NotificationLogger.logError); // catch any error, update event log, rethrow
};

// currently support 3 methods
Notification.prototype.deliverCenter = {
    'text'  : NotificationHelper.sendText,
    'email' : NotificationHelper.sendHTMLEmail,
    'call'  : NotificationHelper.makePhoneCall
};

module.exports = Notification;
