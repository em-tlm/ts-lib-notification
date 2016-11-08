/**
 * Created by kwang on 11/8/16.
 */

var assert = require('assert');
var utils = require('../utils');

var prodWhiteList = ['*'] ;
var nonProdWhiteList = ['*@tetrascience.com', 'spinwang525@gmail.com'];

describe('Production env', function () {

    var user1 = 'abc@tetrascience.com';
    var user2 = '123@gmail.com';
    var user3 = 'A.B.C@vertex.com';
    var user4 = '!@#$%^&&*()_+-=';

    it ('user1 should match', function () {
        assert(utils.userNameInWhiteList(user1, prodWhiteList));
    });

    it ('user2 should match', function () {
        assert(utils.userNameInWhiteList(user2, prodWhiteList));
    });

    it ('user3 should match', function () {
        assert(utils.userNameInWhiteList(user3, prodWhiteList));
    });

    it ('user4 should match', function () {
        assert(utils.userNameInWhiteList(user4, prodWhiteList));
    });

});

describe('Non-production env', function () {

    var user1 = 'abc@tetrascience.com';
    var user2 = 'spinwang525@gmail.com';
    var user3 = 'A.B.C@vertex.com';
    var user4 = '!@#$%^&&*()_+-=';

    it ('user1 should match', function () {
        assert(utils.userNameInWhiteList(user1, nonProdWhiteList));
    });

    it ('user2 should match', function () {
        assert(utils.userNameInWhiteList(user2, nonProdWhiteList));
    });

    it ('user3 should not match', function () {
        assert(!utils.userNameInWhiteList(user3, nonProdWhiteList));
    });

    it ('user4 should not match', function () {
        assert(!utils.userNameInWhiteList(user4, nonProdWhiteList));
    });

});