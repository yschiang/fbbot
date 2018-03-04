const request = require('request');
const api = require('../../configs').SERVICE.CHZW_URL;


var metadata = {
    "skill": "simplified chinese to traditional chinese",
    "provider": ""
}

/**
 * Simplified Chinese to Traditional Chinese transforming lib
 * 
 * Note this returns a Promise and the caller should behave to use it.
 */
var chzw = (str) => {
	return new Promise( (resolve, reject) => {
		console.log('Libskill chzw translating: ' + str);

		request.post({
			headers: {'content-type' : 'application/x-www-form-urlencoded'},
			url: api,
			body: 'text=' + str
		}, (err, res, body) => {
			if (err) {
				reject(err);
				return;
			}
			console.log('zhtw success', res.body)
			resolve(res.body);
		})
	}).catch( err => {
		console.log('Libskill chzw error:' + JSON.stringify(err));
	})
}



module.exports = {
    metadata: metadata,
    do: chzw
};