const { resolvePhonePreference } = require('./NotificationHelper');
const { EventEmitter } = require('events');
const eventEmitter = new EventEmitter();

// Notification event logger
module.exports.logEvent = function (notification) {
    eventEmitter.emit('create', notification);
    return notification; // return notification if logger not defined
};

// Notification error logger
module.exports.logError = function (error) {
    if (error.notification && error.notification.user) {

        const method = error.notification.method;
        const backup = error.notification.backup ? 'true' : 'false';
        const recipient = method === 'email' ? error.notification.user.username : resolvePhonePreference(error.notification);
        const description = error.error ? error.error.message : '-';

        error.notification.status = 'failed';
        error.notification.stage = error.stage;
        error.message = `Notification failed! STAGE: ${error.stage} METHOD: ${method} RECIPIENT: ${recipient} ERROR: ${description} BACKUP: ${backup}`;
    }

    eventEmitter.emit('error', error);

    throw error; // rethrow error to catch in next promise chain (if exists)
};

module.exports.logDispatch = function (notification) {
    notification.stage = 'remote';
    eventEmitter.emit('dispatch', notification);
    return notification;
};

module.exports.eventEmitter = eventEmitter;
