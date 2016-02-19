/* node modules */
var format          = require('string-format');
var emailTemplates  = require('email-templates');
var Q               = require('q');

var compile;
var templates;

// Custom error for Compile stage
function formatError(err, notification) {
    return {
        'stage'        : 'format',
        'error'        : err,
        'notification' : notification
    };
}

module.exports.setTemplates = function(emailTemplateDir, templateConfig){
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
        return Q.reject(formatError(new Error('No template defined for notification type and method'), notification));
    }

    var deferred = Q.defer();

    try {
        // format the body of the notification
        if (notification.method != 'email') {

            notification.body = format(templates[notification.type][notification.method], notification);

            deferred.resolve(notification);

        } else {

            compile(notification.type, notification, function (err, html, text) {

                if (err) {
                    return deferred.reject(formatError(err, notification));
                }

                notification.body    = html;
                notification.subject = format(templates[notification.type][notification.method], notification);

                deferred.resolve(notification);
            });

        }

    } catch (error) {
        deferred.reject(formatError(error, notification));
    }

    return deferred.promise;
};
