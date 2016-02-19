var Q           = require('q');
var twilio      = require('twilio');
var AWS         = require('aws-sdk');
var ses         = require('nodemailer-ses-transport');
var nodemailer  = require("nodemailer");

var config;
var client, twilioNumber; //twilio
var transporter; //email

module.exports.init = function(config_){
    config = config_;
    /* set up twilio */
    var accountSid   = config.twilio.accountSid;
    var authToken    = config.twilio.authToken;
    twilioNumber = config.twilio.twilioNumber;
    client       = new twilio.RestClient(accountSid, authToken);

    // Use AWS SES to send emails
    // these are the same credentials are used for s3
    transporter = nodemailer.createTransport(ses({
        'accessKeyId'     : config.aws.accessKeyId,
        'secretAccessKey' : config.aws.secretAccessKey,
        'region'          : config.aws.region
    }));
};

// todo: make a module that distributes request into a pool of twilio numbers

// Custom error for Dispatch stage
function dispatchError(err, notification) {
    return {
        'stage'        : 'dispatch',
        'error'        : err,
        'notification' : notification
    };
}

module.exports.sendText = function (notification) {

    var phone = resolvePhonePreference(notification);

    if (!phone) {
        return Q.reject(dispatchError(new Error('No phone defined'), notification));
    }

    if (config.env === 'test') {
        return Q.resolve(notification);
    }

    var deferred = Q.defer();

    var params = {
        'to'                   : phone,
        'from'                 : twilioNumber,
        'body'                 : notification.body
    };

    if (config.env !== 'local') {
        params.statusCallback       = config.baseURL + '/notification/text/callback',
        params.statusCallbackMethod = 'POST'
    }

    client.sendMessage(params, function (err, response) {

        if (err) {
            return deferred.reject(dispatchError(err, notification));
        }
        // Make note of twilio message id
        notification.remoteId = response.sid;
        notification.status   = response.status;

        deferred.resolve(notification);
    });

    return deferred.promise;
};

module.exports.sendHTMLEmail = function (notification) {

    if (config.env == 'test') {
        return Q.resolve(notification);
    }

    var deferred = Q.defer();

    transporter.sendMail({
        'from'    : notification.fromEmail || config.email.ts,
        'to'      : notification.user.username,
        'subject' : notification.subject,
        'html'    : notification.body
    }, function (err, response) {

        if (err) {
            return deferred.reject(dispatchError(err, notification));
        }

        notification.remoteId = response.messageId;
        notification.status   = 'sent';

        deferred.resolve(notification);
    });

    return deferred.promise;
};


module.exports.makePhoneCall = function (notification) {

    var phone = resolvePhonePreference(notification);

    if (!phone) {
        return Q.reject(dispatchError(new Error('No phone defined'), notification));
    }

    if (config.env === 'test') {
        return Q.resolve(notification);
    }

    var deferred = Q.defer();

    // call script fileName
    var fileName = notification.callId + Date.now() + '.xml';
    // s3 params
    var params = {
        'Bucket'      : config.aws.webPublicBucket,
        'Key'         : fileName,
        'Body'        : notification.body,
        'ContentType' : 'text/xml',
        'ACL'         : 'public-read' // give public read permission
    };

    // twilio call params
    var callParams = {
        'to'                   : phone,
        'from'                 : twilioNumber,
        'url'                  : config.aws.webPublicBucketUrl + '/' + fileName,
        'method'               : 'GET', // default is post, but S3 doesn't accept that
    };

    if (config.env !== 'local') {
        callParams.statusCallback       = config.baseURL + '/notification/call/callback';
        callParams.statusCallbackMethod = 'POST';
        callParams.statusCallbackEvent  = ['completed'];
    }

    // save the call script in s3
    var s3 = new AWS.S3();

    s3.putObject(params, function (err, data) {

        if (err) {
            return deferred.reject(dispatchError(err, notification));
        }

        client.makeCall(callParams, function (err, response) {

            if (err) {
                // TODO: Reject with error, or update notification status and resolve?
                return deferred.reject(dispatchError(err, notification));
            }

            notification.remoteId = response.sid;
            notification.status   = response.CallStatus;

            deferred.resolve(notification);
        });
    });

    return deferred.promise;
};


/*
 * Resolve user phone alert preference, changes the number in the notification user object
 */
function resolvePhonePreference(notification) {

    if (!notification.user) {
        return;
    }

    var phone1 = notification.user.phone;
    var phone2 = notification.user.backupPhone;

    if (notification.alert && notification.user.alertPreference && notification.method in notification.user.alertPreference) {

        var preference = notification.user.alertPreference[notification.method];

        if (preference !== 'primary') {
            phone1 = preference === 'backup' ? notification.user.backupPhone : preference;
            phone2 = notification.user.phone;
        }

    }

    return notification.backup ? phone2 : phone1;
}

module.exports.resolvePhonePreference = resolvePhonePreference;