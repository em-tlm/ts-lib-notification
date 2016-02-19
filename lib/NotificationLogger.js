var resolver    = require('./NotificationHelper').resolvePhonePreference;

var EventEmitter = require('events').EventEmitter;
var eventEmitter = new EventEmitter();

// Notification event logger
module.exports.logEvent = function (notification) {
    eventEmitter.emit('create', notification);
    return notification; // return notification if logger not defined
};

// Notification error logger
module.exports.logError = function (error) {
    if (error.notification && error.notification.user) {

        var method      = error.notification.method;
        var backup      = error.notification.backup ? 'true' : 'false';
        var recipient   = method === 'email' ? error.notification.user.username : resolver(error.notification);
        var description = '-';

        if (error.error) {
            description = error.error.message;
        }

        error.message = 'Notification failed! STAGE: ' + error.stage + ' METHOD: ' + method + ' RECIPIENT: ' + recipient + ' ERROR: ' + description + ' BACKUP: ' + backup;
    }

    eventEmitter.emit('error', error);

    throw error; // rethrow error to catch in next promise chain (if exists)
};

module.exports.logDispatch = function (notification) {
    // Will do nothing is no logEntry present on notification
    eventEmitter.emit('dispatch', notification);

    return notification;
};

module.exports.eventEmitter = eventEmitter;