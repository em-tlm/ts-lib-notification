# ts-notification

ts-notification is a module for sending notifications to TetraScience users.  It supports emails, test messages, and phone calls.  

## Installation
```sh
$ npm install tetrascience/ts-notification --save
```

## Usage
There are 2 ways to use ts-notification.  In either case, you have to first construct a `Notification` object.  After that, you can either call `Notification.send()` directly, or you can serialize the notification and send it to a queue.

### Direct notification
```javascript
var path = require('path');
var tsNotification = require('ts-notification');
var config = require('../config').config;
var template = require('../notification/template');
var emailTemplatePath = path.resolve(__dirname, '..', 'public/email_templates');

tsNotification.init(config, template, emailTemplatePath);

var Notification = tsNotification.Notification;
var user = {
    'username' : email
};

var notification = new Notification({
    'user'   : user,
    'method' : 'email',
    'type'   : 'organization-invite'
});

notification.send();
```

### Send to a queue
**Push notifications to queue**

```javascript
var Notification = require('ts-notification').Notification;
var user = {
    'username' : email
};

var notification = new Notification({
    'user'   : user,
    'method' : 'email',
    'type'   : 'organization-invite'
});

//construct a queue and send it to the queue
//you are responsible for providing an implementation of QueueAdapter
var QueueAdapter = require('../utils/QueueAdapter');
var alertQueue   = new QueueAdapter(config.queues.notifications);
alertQueue.sendToQueue(JSON.stringify(notification));
```
**Poll and process notifications from queue**

```javascript
var path = require('path');
var tsNotification = require('ts-notification');
var config = require('../config').config;
var template = require('../notification/template');
var emailTemplatePath = path.resolve(__dirname, '..', 'public/email_templates');

tsNotification.init(config, template, emailTemplatePath);


var QueueAdapter = require('./../utils/QueueAdapter');
var queue = new QueueAdapter(config.queues.notifications);

tsNotification.startWorker(queue);
```

## API
### `ts-notification`
#### `.init(config, template, emailPath)`
You must call this function before you can start processing notifications.  It initializes the module with your templates and other configuration such as twilio api key.

**config:**

```javascript 
{
	twilio: {
		accountSid:			YOUR_TWILIO_ACCOUNT_SID,
		authToken:			YOUR_TWILIO_AUTH_TOKEN,
		twilioNumber:		YOUR_TWILIO_PHONE_NUMBER
	},
	aws: {
		accessKeyId:		YOUR_AWS_ACCESS_KEY,
		secretAccessKey:	YOUR_AWS_SECRET,
		region:				YOUR_AWS_REGION,
		webPublicBucket:	S3_BUCKET_USED_TO_STORE_CALL_SCRIPTS,
		webPublicBucketUrl:	URL_OF_THE_ABOVE_BUCKET
	},
	baseURL:				BASE_URL_OF_YOUR_SERVER,
	email: {
		ts:					YOUR_EMAIL_ADDRESS
	}
}
```
**NOTE:** `config.js` in tetrascience_cloud provides all of the above automatically

**template:**

```javascript
{
    'sensor-trigger' : {
        text : '[TetraScience] {deviceName}, {feedName} is @ {value}{unitCSV}.'
        + 'You set a threshold of {threshold}{unitCSV}. To acknowledge, press here {ackUrl} .'
        + 'You can view device detail at your dashboard: {dashboardURL}. ',

        call : '<?xml version="1.0" encoding="UTF-8"?> \n<Response> \n\t<Say voice="alice" loop="10">'
        + 'Hello. This call is from Tetrascience.'
        + ' {deviceName} has reached a critical {feedName}'
        + ' of  {threshold} {unitVoice}.'
        + ' Please visit tetrascience.com for further information. Thank you.<\/Say>\n <\/Response>',
        email : '[TetraScience] {deviceName} alert'
    },
    'two-factor' : {
        text: '[TetraScience] you requested a verification code: {twoFactorCode}',
        email: '[TetraScience] You requested a verification code'
    },
    'test-sms' : {
        text: '[TetraScience] Welcome to TetraScience.  We are able to send text message to you!'
    }
};
```

**emailPath:**

```
/path/to/email/templates
```

#### `.Notification`
Exposes the constructor of `Notification`.  Your app is responsible for creating a new `Notification` and either call `send()` or push it to a queue.

#### `.events`
Exposes and `EventEmitter` that you can attach listeners to.

#### `.startWorker(queue)`
Use this function if you want to use queues to buffer notifications before they are actually sent.  `queue` must be compatible with `QueueAdapter`.

###Events

####.emit('create', notification)
Emitted right after `Notification.send()` is called.
####.emit('dispatch', notification)
Emitted after the notification is dispatched
####.emit('error', error)
Emitted after an error has occured. The original `notification` can be accessed at `error.notification`

**Note:** It's your responsibility to listen to these events and track them properly