const request = require('request');
const logger = require('../helper/logger');
const sc2tc = require('./sc2tc');

var metadata = {
    "skill": "translation",
    "provider": "http://fanyi.youdao.com"
}

const apiKey = '398934524';

/**
 * Call Youdao API to translate a string.
 * @param {*} query String to be translated from.
 * @param {*} callback Invoked when the translation is complete. Upon success, inovked
 *            as callback(null, "translated result string"). Upon error, invoked as callback(Error object);
 */
function translate_youdao(query, callback) {
    request.get({
        url: "http://fanyi.youdao.com/openapi.do?keyfrom=robotTranslate&key=" + apiKey + 
             "&type=data&doctype=json&version=1.1&q=" + query
    }, (err, res, body) => {
        if(err) {
            callback(new Error("Translation Skill: Youdao translation API callout failed."));
            return;
        }
        logger.log('Call Youdao translation API success. Translated result: ' + res.body);
        sc2tc.do(res.body).then(result => {
            callback(null, result);
        })
    });
}


module.exports = {
    metadata: metadata,
    do: translate_youdao
};