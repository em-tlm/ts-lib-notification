/**
 * Created by pengwei on 11/3/15.
 */
const Notification = require('./Notification');

module.exports.start = function (queue) {
  queue.setMessageCallback(function (message) {
    const body = JSON.parse(message.content.toString());
    const notification = new Notification(body);

    return notification
      .send()
      .then(notification => queue.ack(message))
      .catch((error) => {
        queue.reject(message);

        // Primary phone fails and backup phone is defined, attempt to send to backup. Only for text and call
        if (notification.method !== 'email' && !notification.backup && notification.user.backupPhone) {
          notification.backup = true;
          queue.sendToQueue(JSON.stringify(notification));
        }
      });
  });
}
