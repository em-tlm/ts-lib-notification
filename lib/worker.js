/**
 * Created by pengwei on 11/3/15.
 */

var Notification = require('./Notification');

function start(queue){
    queue.setMessageCallback(function (message) {

        var body         = JSON.parse(message.content.toString());
        var notification = new Notification(body);

        notification.send().then(function (notification) {

            queue.ack(message);

        }, function (error) {

            queue.reject(message);

            // Primary phone fails and backup phone is defined, attempt to send to backup. Only for text and call
            if (notification.method !== "email" && !notification.backup && notification.user.backupPhone) {
                notification.backup = true;
                queue.sendToQueue(JSON.stringify(notification));
            }
        });
    });
}


module.exports.start = start;