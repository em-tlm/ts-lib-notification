/**
 * Created by pengwei on 2/18/16.
 */
const formatter = require('./lib/NotificationFormatter');
const helper = require('./lib/NotificationHelper');

function init(config, template, emailPath) {
    formatter.setTemplates(emailPath, template);
    helper.init(config);
}

module.exports.init = init;
module.exports.Notification = require('./lib/Notification');
module.exports.events = require('./lib/NotificationLogger').eventEmitter;
module.exports.startWorker = require('./lib/worker').start;
