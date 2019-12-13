const assert = require('assert');
const Promise = require('bluebird');
const Twilio = require('twilio');
const AWS = require('aws-sdk');
const ses = require('nodemailer-ses-transport');
const nodemailer = require("nodemailer");

const utils = require('../utils');

let config;
let client; //twilio
let transporter; //email
let S3;

function initS3(config) {
  if (config.provider_storage === 's3') {
    return new AWS.S3();
  } else if (config.provider_storage === 'fakes3') {
    assert(config.s3_fake_host, 'No s3_fake_host');
    assert(config.s3_fake_port, 'No s3_fake_port');
    return new AWS.S3({
      s3ForcePathStyle: true,
      accessKeyId: 'ACCESS_KEY_ID',
      secretAccessKey: 'SECRET_ACCESS_KEY',
      endpoint: new AWS.Endpoint(`http://${config.s3_fake_host}:${config.s3_fake_port}`),
    });
  }

  throw new Error(`Invalid provider_storage: ${config.provider_storage}`);
}

function initMailer(config) {
  if (config.provider_email === 'smtp') {
    assert(config.smtp_host, 'No smtp_host');
    assert(config.smtp_port, 'No smtp_port');

    const smtpConf = {
      host: config.smtp_host,
      port: config.smtp_port,
      secure: config.smtp_secure,
      tls: { rejectUnauthorized: false },
    };

    if (config.smtp_user && config.smtp_pass) {
      smtpConf.auth = {
        user: config.smtp_user,
        pass: config.smtp_pass,
      };
    }

    // control email per second rate for testing purposes
    if (config.smtp_limit_rate) {
      smtpConf.rateLimit = true;
      smtpConf.maxMessages = 2;
      smtpConf.pool = true;
      smtpConf.maxConnections = 1;
      smtpConf.rateDelta = 11000; // send emails every 11 seconds
    }

    return nodemailer.createTransport(smtpConf);
  } else if (config.provider_email === 'ses') {
    // Use AWS SES to send emails
    // these are the same credentials are used for s3
    return nodemailer.createTransport(ses({
      accessKeyId: config.aws.accessKeyId,
      secretAccessKey: config.aws.secretAccessKey,
      region: config.aws.region
    }));
  }

  throw new Error(`Invalid provider_email: ${config.provider_email}`);
}

module.exports.init = function (config_) {
  config = config_;
  client = new Twilio(config.twilio.accountSid, config.twilio.authToken);

  S3 = initS3(config);
  transporter = initMailer(config);
};

function getS3Url(bucket) {
  return config.aws.bucketUrlFormat.replace(/_bucketname_/g, bucket);
}

// Custom error for Dispatch stage
function dispatchError(error, notification) {
  return {
    stage: 'dispatch',
    error,
    notification,
  };
}

module.exports.sendText = function (notification) {
  const phone = resolvePhonePreference(notification);

  if (!phone) {
    return Promise.reject(dispatchError(new Error('No phone defined'), notification));
  }

  if (config.env === 'test') {
    return Promise.resolve(notification);
  }

  const message = {
    to: phone,
    from: config.twilio.twilioNumber,
    body: notification.body,
  };

  if (config.env !== 'local') {
    message.statusCallback = config.baseURL + '/notification/text/callback',
    message.statusCallbackMethod = 'POST'
  }

  return client.messages
    .create(message)
    .then((response) => {
      // Make note of twilio message id
      notification.remoteId = response.sid;
      notification.status = response.status;
      return notification;
    })
    .catch((err) => {
      throw dispatchError(err, notification);
    });
};

module.exports.sendHTMLEmail = function (notification) {
  if (config.env == 'test') {
    return Promise.resolve(notification);
  }

  if (!utils.userNameInWhiteList(notification.user.username, config.notificationEmailWhiteList)) {
    return Promise.reject(new Error(`email not in whitelist: ${notification.user.username}`));
  }

  const payload = {
    from: notification.fromEmail || config.email.ts,
    to: notification.user.username,
    subject: notification.subject,
    html: notification.body,
  };

  if (config.env != 'production') {
    payload.subject = `[${config.env}] ${notification.subject}`;
  }

  if (config.env != 'local' && config.email.bcc) {
    payload.bcc = config.email.bcc;
  }

  return transporter
    .sendMail(payload)
    .then((response) => {
      notification.remoteId = response.messageId;
      notification.status = 'sent';
      return notification;
    })
    .catch(err => dispatchError(err, notification));
};

module.exports.makePhoneCall = function (notification) {
  const phone = resolvePhonePreference(notification);

  if (!phone) {
    return Promise.reject(dispatchError(new Error('No phone defined'), notification));
  }

  if (config.env === 'test') {
    return Promise.resolve(notification);
  }

  const fileName = notification.callId + Date.now() + '.xml';
  const s3params = {
    Bucket: config.aws.webPublicBucket,
    Key: fileName,
    Body: notification.body,
    ContentType: 'text/xml',
    ACL: 'public-read' // give public read permission
  };

  return S3
    .putObject(s3params)
    .promise()
    .then((data) => {
      const callParams = {
        to: phone,
        from: config.twilio.twilioNumber,
        url: getS3Url(config.aws.webPublicBucket) + fileName,
        method: 'GET', // default is post, but S3 doesn't accept that
      };

      if (config.env !== 'local') {
        callParams.statusCallback = config.baseURL + '/notification/call/callback';
        callParams.statusCallbackMethod = 'POST';
        callParams.statusCallbackEvent = ['completed'];
      }

      return client.calls.create(callParams);
    })
    .then((response) => {
      notification.remoteId = response.sid;
      notification.status = response.status;
      return notification;
    })
    .catch(err => dispatchError(err, notification));
};

/*
 * Resolve user phone alert preference, changes the number in the notification user object
 */
function resolvePhonePreference(notification) {
  if (!notification.user) {
    return;
  }

  let phone1 = notification.user.phone;
  let phone2 = notification.user.backupPhone;

  if (notification.alert
      && notification.user.alertPreference
      && notification.method in notification.user.alertPreference) {

    const preference = notification.user.alertPreference[notification.method];

    if (preference !== 'primary') {
      phone1 = preference === 'backup' ? notification.user.backupPhone : preference;
      phone2 = notification.user.phone;
    }

  }

  return notification.backup ? phone2 : phone1;
}

module.exports.resolvePhonePreference = resolvePhonePreference;
