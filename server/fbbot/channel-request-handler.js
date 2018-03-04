const logger = require('../helper/logger') || console;

const iconv = require('iconv-lite');
const request = require('request');
const moment = require('moment');
const schedule = require('node-schedule');
const wget = require('node-wget');
const fs = require('fs');

const iflyUrl = require('../../configs').SERVICE.IFLY_URL;
const translate = require('../libskill/translate.js');

logger.log('Invoking reply module.');

const trimWhite = str => str.replace(/\s/g,'');
const isJSON = str => {
    try {
        const res = JSON.parse(str);
		return typeof(res) === 'object';
    } catch (e) {
        return false;
    }
}

module.exports = (botapp, channelAgent) => {

	logger.log("Request Handler module being initiated.");

	const handler = (userContext, message, data) => {
		if (!data) {
			return;
		}

		let sender = userContext.user;
		let userContextData = userContext.context;
		let userContextMsg = userContext.msg;

		logger.log("Request Handler function being invoked.", {
			"sender": sender,
			"message": message,
			"context": userContextData,
			"contextMsg": userContextMsg
		});

		const mid = message.message.mid.toString();
		const attachments = data.attachments;
		userContextMsg[mid] = {};
		// userContextMsg[mid].rc = true;


		if (data.attachments && data.attachments.image) { // Image Flow
			
			imageFlow(channelAgent, data, userContext, userContextMsg, mid);

		} else { // text message flow


			// text message by default
			if (!data.text) {
				return;
			}

			const buf = iconv.encode(data.text, 'UTF8');

			logger.log('Old conversation?',
				userContextData.oldConversation ? "N/A" : userContextData.oldConversation);

			// flow 2 - publish request to iot platform
			const payload = {
				sender: sender,
				mid: mid,
				oldConv: userContextData.oldConversation,
				type: 'text',
				data: trimWhite(data.text)
			};

			logger.log('Sending payload.', JSON.stringify(payload));
			botapp.sendIotRequestEvent('iot-2/evt/text/fmt/json', JSON.stringify(payload));

			// flow 1 - ifly reasoning
			iflyTextFlow(channelAgent, data, userContext, userContextMsg, mid);


		} // end of text message
	}

	return handler;
}

/**
 * 
 * @param {*} data 
 * @param {*} userContextMsg 
 * @param {*} mid message id received from of facebook webhook
 */
function iflyTextFlow(channelAgent, data, userContext, userContextMsg, mid) {

	let sender = userContext.user;

	request.post({
		headers: {'content-type' : 'application/x-www-form-urlencoded'},
		url: iflyUrl,
		body: "text=" + trimWhite(data.text.replace('+', '加'))
	}, (err, res, body) => {
		if (err) {
			logger.error('Error calling ifly service.', err);
			return;
		}
		const data = res.body;
		const iflydata = data.split("#");
		logger.log('ifly api service data returned.', iflydata);

		userContextMsg[mid].rc = data ? true : false;

		if (!data || data === 'noanswer') {

			if (userContextMsg[mid] !== undefined) {
				userContextMsg[mid].rc = false;
			}

		} else if ( !isJSON(iflydata[2]) ) {
			
			channelAgent.sendText(userContext, iflydata[2]);

		} else {

			// ifly has answer
			const iflyObj = JSON.parse(iflydata[2]);
			const {
				keywords, location, name, content,
				category, special, song, artist,
				datetime, startLoc, endLoc, startDate
			} = (iflyObj.semantic && iflyObj.semantic.slots)? iflyObj.semantic.slots: {}

			const intent = iflydata[1];

			if (iflydata[1] === 'weather') {

				const weatherData = iflyObj;
				const weatherStr = weatherData.city + ":" + weatherData.weather
					+ weatherData.tempRange + '\n' + weatherData.wind
					+ ", 濕度: " + weatherData.humidity;

				channelAgent.sendText(userContext, weatherStr);

			} else if (iflydata[1] === 'cookbook') {

				const cookbook = iflyObj;
				const cookinfo = cookbook.ingredient + " : " + cookbook.accessory;
				
				channelAgent.sendText(userContext, cookinfo);

			} else if (iflydata[2].indexOf('translation') > -1) {

				const searchKey = content;
				const strBuf = iconv.encode(content, 'utf8');

				translate.do(encodeURI(strBuf.toString('utf8')), (error, output) => {
					if (error) {
						logger.error(error);
						return;
					}

					const { translation, query, basic } = JSON.parse(output);
					const question = query +':'+ translation[0];
					const translated = (basic && basic.explains) ? ('\n'+basic.explains.join('\n')) : '';
					channelAgent.sendText(userContext, question + translated);
				});

			} else if (iflydata[2].indexOf('schedule') > -1) {

				const mydate = moment(datetime.date+" "+datetime.time);
				const cont = trimWhite(content);

				if (name === 'reminder') {
					//logger.log('Create Calendar entry at Google Calendar');
				} else {
					const j = schedule.scheduleJob(
						mydate.toDate(),
						() => {
							// ifly reply timeup
							channelAgent.sendText(userContext, '時間到了！'+ cont);
						}
					);
				}
				logger.log('Create scheduler on' + mydate.toDate());
				// ifly reply timer
				channelAgent.sendText(userContext, '為你安排 :' + datetime.date +":"+ datetime.time +":"+ name +":"+ cont);

			} else if(iflydata[2].indexOf('websearch') > -1) {
				logger.log('Skill Web Search =============== :');
				const searchKey = trimWhite(
					keywords? keywords: iflyObj.text
				)
				logger.log('search key:', searchKey);
				const payload ={
					sender: sender,
					mid: mid,
					data: searchKey
				}
				botapp.sendIotRequestEvent('iot-2/evt/websearch/fmt/json', JSON.stringify(payload));
				channelAgent.sendText(userContext, '我幫你找找，請稍等... : \n' + searchKey);

			} else if (iflydata[2].indexOf('restaurant') > -1){
				logger.log('Skill restaurantSearchK =============== :');
				const oldPlace = (userContextData.oldConversation)?
					userContextData.oldConversation.place: null
				const searchKey = trimWhite(
					keywords? keywords
					: (name || category || special)?
						((location.poi === 'CURRENT_POI')?
							oldPlace? oldPlace: '台北'
							: location.poi
						) +' '+ (name || category || special)
					: iflyObj.text
				)
				logger.log('search key:',searchKey)
				const payload = {
					sender: sender,
					mid: mid,
					type: 'text',
					data: searchKey
				}
				botapp.sendIotRequestEvent('iot-2/evt/restaurant/fmt/json', JSON.stringify(payload));

				channelAgent.sendText(userContext, '為你找尋............... : \n' + searchKey);

			} else if (iflydata[2].indexOf('map') > -1) {
				logger.log('Skill Map Search=============== :')
				if(iflyObj.operation=='POSITION'){
					const searchKey = location.poi?
						location.poi: iflyObj.text
					logger.log('search key:', searchKey)
					const payload = {
						sender: sender,
						mid: mid,
						type: 'text',
						data: searchKey
					}
					botapp.sendIotRequestEvent('iot-2/evt/location/fmt/json', JSON.stringify(payload));

					channelAgent.sendText(userContext,  '為你找尋............... : \n' + searchKey);

				}

			} else if (data.split("#")[2].indexOf('train') > -1) {
				logger.log('Skill THSRC 時刻表 Search=============== :')
				const now = moment();
				let SearchDate = now.format("YYYY/MM/DD")		//出發日期
				let SearchTime = now.format("HH:mm") 			//出發時間
				let traindate // =moment("2017-01-14 09:00:00", "YYYY-MM-DD hh:mm:ss");
				const StartStation = startLoc?
					(startLoc.areaAddr || startLoc.cityAddr || '台北'): '台北'
				const EndStation = endLoc?
					(endLoc.areaAddr || endLoc.cityAddr || '左營'): '左營'
				if(startDate) {
					   if(startDate.date){
					   traindate = moment(startDate.date+' 09:00:00', "YYYY-MM-DD HH:mm:ss")
					   SearchDate = traindate.format("YYYY/MM/DD")
					  // SearchTime =traindate.format("hh:mm");
				   }
				   if(iflyObj.semantic.slots.startDate.time){
					   traindate =moment(SearchDate+' '+startDate.time, "YYYY-MM-DD HH:mm:ss")
					   SearchTime =traindate.format("HH:mm");
				   }
			   }
			   const trip = '行程 :'+StartStation+'站 到 '+EndStation +'站\n日期:'+SearchDate+' 時間:'+SearchTime
			   logger.log(trip)
			   const payload = {
					type: 'hsr',
					sender: sender,
					mid: mid,
					data: {
						StartStation: trimWhite(StartStation),
						EndStation: trimWhite(EndStation),
						SearchDate: SearchDate,
						SearchTime: SearchTime
					},
				}

				botapp.sendIotRequestEvent('iot-2/evt/hsr/fmt/json', JSON.stringify(payload));
				channelAgent.sendText(userContext,  '查詢中... : ' + trip);

			} else if(iflydata[2].indexOf('music') > -1) {
				const iObj = JSON.parse(trimWhite(data).substr(12))
				logger.log('Skill music=============== :'+data)
				const searchKey = trimWhite(
					song? (artist? artist+':': '')+song: iObj.text
				)
				logger.log('Skill search key:',searchKey)

				if(iObj.data.result && iObj.data.result.length > 0 ){
					const songURL = trimWhite(iObj.data.result[0].downloadUrl).replace('http', 'https');
					logger.log('Music Download URL:',songURL);

					channelAgent.sendText(userContext,  '你也可以輸入歌手及歌名哦!\n正在為你準備:'+searchKey);

					setTimeout( ()=> {
						logger.log('Sending Audio to channel')
						channelAgent.sendAudio(userContext, songURL);
					}, 5000);
				}
			 } else {
				logger.log('No pre-defined intent/skill parsed. Returning ifly returned text.', iflydata[2].text);
				channelAgent.sendText(userContext, iflydata[2].text);
			}
		} // endif ifly has answer

	})// end of ifly service POST req
}

function imageFlow(channelAgent, data, userContext, userContextMsg, mid) {
	
	logger.log("Enter imageFlow");

	let sender = userContext.user;
	const imageURL = data.attachments.image[0];
	const imageName = imageURL.split('/').pop();
	

	wget({
		url:  imageURL,
		//dest: 'image/',     // destination path or path with filenname, default is ./
		timeout: 2000       // duration to wait for request fulfillment in milliseconds, default is 2 seconds
	}, (err, res, body) => {
		if (err) {
			logger.error('Failed to wget image.', err);
		} else {
			const imgFilename = imageName.split('?')[0];
			logger.log('Image ' + imgFilename + ' is downloaded.');
		
			fs.readFile(/*'image/'+*/imgFilename, (err, data) => {
				if (err) {
					logger.error("Failed to read image.", err);
				}
		
				const imageBuf = new Buffer(data, 'base64');
				let tagstr = '';
				request.post({
					url: 'https://gateway-a.watsonplatform.net/visual-recognition/api/v3/classify?api_key=175b0d1851de47f2f2eb66c6b957ef44517b71e2&version=2016-05-20&threshold=0.0&owners=me,IBM&classifier_ids=default',//,MyFamily_2064546796
					body: imageBuf,
					headers: {
						'Content-Length': imageBuf.length
					}
				}, (err, res, body) => {
					logger.log('IMG classify res:' + res.statusCode);
					if (err || res.statusCode !== 200) {
						logger.error ("IMG classification error.", {
							"error": err,
							"status": res.statusText
						});
					} else {
						const imageobj = JSON.parse(body);
						logger.log("IMG classified body.", imageobj);
		
						const classifiers = imageobj.images[0].classifiers;
		
						if (classifiers.length > 0) {
		
							for (let j = 0; j < classifiers.length; j++) {
								logger.log('classifier:',classifiers[j]);
								const { name, classes } = classifiers[j];
								if (name === 'MyFamily') {
									classes.sort( (a, b) => {
										return parseFloat(b.score) - parseFloat(a.score);
									});
									logger.log('family:' + JSON.stringify(classes));
									tagstr += (classes[0].class + ",");
								} else {
									for (let i = 0; i < 3; i++) {	
										tagstr += (classes[i].class + ",");
									}
								}
							}
		
							if (tagstr.indexOf('hole-in-the-wall') > -1
								&& tagstr.indexOf('mirror') > -1
								&& tagstr.indexOf('reflector') > -1) {

									channelAgent.sendText(userContext, '讚, 謝謝你的稱讚');

							} else {
								translate.do(tagstr, (error, output) => {
									if (error) {
										logger.error(error);
										return;
									}
									const { translation, query, basic } = JSON.parse(output);
									channelAgent.sendText(userContext, '照片看起來像' + translation);
								});
							}
						}
						//botapp.sendIotRequestEvent('iot-2/evt/imagekeyword/fmt/json', body);
					}
				}) // end of image tags
		
				request.post({
					url: 'https://gateway-a.watsonplatform.net/visual-recognition/api/v3/detect_faces?api_key=175b0d1851de47f2f2eb66c6b957ef44517b71e2&version=2016-05-20',
					body: imageBuf,
					headers: {
						'Content-Length': imageBuf.length
					}
				}, (err, res, body) => {
					logger.log('detect face res:' + res.statusCode)
					if (err || res.statusCode !== 200) {
						logger.log("detect face err:",err)
						logger.log("detect face res.statusText:", res.statusText)
					} else {
						logger.log(body)
						const imageobj = JSON.parse(body)
						const firstImg = (imageobj && imageobj.images[0])?
							imageobj.images[0]: null
		
						let facestr = ''
						if( firstImg.faces && firstImg.faces.length > 0 ){
							//Found People in the photo.Pub to Similarity Search
							const payload ={
								data: imageURL,
								sender: sender,
								mid: mid
							}
		
							botapp.sendIotRequestEvent('iot-2/evt/similarity/fmt/json', JSON.stringify(payload));
		
							const faces = firstImg.faces.sort( (a, b) => {
								return a.face_location.left - b.face_location.left
							})
							for (let i = 0; i < faces.length; i++) {
								facestr += (faces[i].identity)?
									faces[i].identity.name + ":": ''
								+ faces[i].gender.gender + ","
								+ ( (typeof faces[i].age.min === 'undefined')?
									'0': faces[i].age.min) +"-"+ faces[i].age.max + ","
							}
							
							
							channelAgent.sendText(userContext, '照片裡頭有' + faces.length + '個人，由左至右分別是:' + facestr);
						}
					}
				})	// end of image face detection
			})	// end of read img file

		} 	// end of else
	})	// end of wget img
}