/**
 * Created by kwang on 11/8/16.
 */

/*
 * User must match at least one regex in the white list to send out email, if white list is empty, return true
 */
module.exports.userNameInWhiteList = function(username, whiteList) {
    if (!whiteList || whiteList.length === 0) {
        return false;
    }

    for(var i=0; i<whiteList.length; i++) {
        if (username.match(RegExp(transformToRegex(whiteList[i])))) {
            return true;
        }
    }
    return false;
};

function transformToRegex(string) {
    if (string.indexOf('*') === 0) {
        string = '.' + string;
    }
    string = '^' + string + '$';
    return string;
}
