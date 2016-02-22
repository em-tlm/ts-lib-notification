/**
 * Created by pengwei on 2/22/16.
 */

var assert = require('assert');
var resolvePhonePreference = require('../lib/NotificationHelper').resolvePhonePreference;
var Notification = require('../lib/Notification');

describe('User alerting preference', function () {

    var notification1 = new Notification({
        'method' : 'text',
        'alert' : true,
        'user' : {
            'phone'           : '11111',
            'backupPhone'     : '22222',
            'alertPreference' : {
                'text'        : 'primary',
                'call'        : 'primary'
            }
        }
    });

    var notification2 = new Notification({
        'method' : 'text',
        'alert' : true,
        'user' : {
            'phone'       : '11111',
            'backupPhone' : '22222',
            'alertPreference' : {
                'text'        : 'backup',
                'call'        : 'backup'
            }
        }
    });

    var notification3 = new Notification({
        'method' : 'call',
        'alert'  : true,
        'user'   : {
            'phone' : '11111',
            'backupPhone' : '22222',
            'alertPreference' : {
                'text'        : '33333',
                'call'        : '44444'
            }
        }
    });

    var notification4 = new Notification({
        'method' : 'email',
        'alert'  : false,
        'user' : {
            'phone' : '11111',
            'backupPhone' : '22222'
        }
    });

    it ('should resolve primary number', function () {
        var result = resolvePhonePreference(notification1);
        assert(result === '11111');
    });

    it ('should resolve backup number', function () {
        var result = resolvePhonePreference(notification2);
        assert(result === '22222');
    });

    it ('should resolve other number', function () {
        var result = resolvePhonePreference(notification3);
        assert(result === '44444');
    });

    it ('should not change number', function () {
        var result = resolvePhonePreference(notification4);
        assert(result === '11111');
    });

});