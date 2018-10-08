const Promise = require('bluebird');
const format = require('string-format');
const emailTemplates = require('email-templates');

let compile;
let templates;

// Custom error for Compile stage
function formatError(error, notification) {
  return {
    stage: 'format',
    error,
    notification,
  };
}

module.exports.setTemplates = function (emailTemplateDir, templateConfig) {
  emailTemplates(emailTemplateDir, function (err, template) {
    if (err) {
      throw err;
    }

    compile = template;
  });

  templates = templateConfig;
};

module.exports.formatBody = function (notification) {
  if (!(notification.type in templates && notification.method in templates[notification.type])) {
    return Promise.reject(
      formatError(new Error('No template defined for notification type and method'), notification)
    );
  }

  return new Promise((resolve, reject) => {
    // format the body of the notification
    if (notification.method != 'email') {
      notification.body = format(templates[notification.type][notification.method], notification);
      return resolve(notification);
    }

    compile(notification.type, notification, function (err, html, text) {
      if (err) {
        return reject(formatError(err, notification));
      }

      notification.body = html;
      notification.subject = format(templates[notification.type][notification.method], notification);

      return resolve(notification);
    });
  });
};
