const request = require('request');
const type_zh_tw = require('../kbase/placetypes');
const stockname = require('../kbase/stocknames');
const currencySymbols = require('../kbase/currency-symbols');

const toTraditionalChinese = require('../libskill/sc2tc');
const logger = require('../helper/logger') || console;

module.exports = (channelAgent) => (payload, userCtx) => {

	const botly = channelAgent.botly;

	const type = payload.type;
	const prev = payload.prev;
	const sender = prev.sender;
	const data = payload.data;
	const elements = [];

	switch (type) {
		case 'music':
			
			const audioUrl = data.music;
			logger.log("Respond playing song.", { "audioUrl": audioUrl });

			channelAgent.sendAudio(userCtx, audioUrl);
			break;

		case 'websearch':
			console.log('wiki data:', data)
			toTraditionalChinese.do(data.result).then(zh => {
				if (data.link) {
					botly.sendButtons({
						id: sender,
						text: zh,
						buttons: [{
							type: 'web_url',
							url: data.link,
							title: 'wiki'
						}]
					}, (err, data) => {
						console.log('websearch send:', err, data)
					})
				} else {
					botly.sendText({
						id: sender,
						text: zh
					}, (err, data) => {
						console.log('websearch send:', err, data)
					})
				}
			})
			break
		case 'news':
			data.news.map(n => {
				if (elements.length < 4) {
					console.log(n.link)
					const titleSeg = n.title.split(' - ')
					const publisher = titleSeg[1] ? titleSeg[1] + ' | ' : ''
					elements.push({
						image_url: n.imageUrl,
						title: titleSeg[0],
						subtitle: publisher + n.time + ' | ' + n.category,
						buttons: [{
							type: 'web_url',
							title: 'open link',
							url: n.link
						}]
					})
				}
			})
			botly.sendAttachment({
				id: sender,
				type: 'template',
				payload: {
					template_type: 'list',
					top_element_style: 'compact',
					elements: elements,
					buttons: [{
						title: 'View More',
						type: 'postback',
						payload: 'payload'
					}]
				}
			}, (err, data) => {
				console.log("news cb:", err, data)
			})
			break
		case 'weather':
			data.weather.map( w => {
				elements.push({
					image_url: w.imageUrl,
					title: w.name + ' - ' + w.time,
					subtitle: w.narrative + " " + w.lunar,
					/*buttons: [{
						type: 'web_url',
						title: 'google',
						url: 'https://www.google.com'
					}]*/
				})
			})
			botly.sendGeneric({
				id: sender,
				aspectRatio: 'square',
				elements: elements
			}, (err, data) => {
				console.log('weather gen cb:', err, data)
			})
			if (elements.length === 1)
				botly.sendText({
					id: sender,
					text: data.weather[0].suggestion
				}, (err, data) => {
					console.log('weather sug cb:', err, data)
				})
			break
		case 'stock':
			const stockCode = data.stock.split(':')
			const tpe = stockCode[0] === 'TPE'
			const name = tpe? stockname[stockCode[1]] : data.name
			const url = tpe ? 'http://www.masterlink.com.tw/stock/individual/individualIndex.aspx?stockId='+stockCode[1]
				:'https://www.google.com/finance?cid=' + data.info.id
			const l = data.info.l
			const c = data.info.c
			elements.push({
				//image_url: data.graphUrl,
				title: l + ' | ' + c + ' (' + Math.round(10000 * c / l) / 100 + '%)',
				subtitle: name,
				buttons: [{
					type: 'web_url',
					title: '下單',
					url: url
				}]
			})
			botly.sendImage({
				id: sender,
				url: data.graphUrl
			}, (err, data) => {
				console.log("stock img cb:", err, data)
				botly.sendGeneric({
					id: sender,
					elements: elements
				}, (err, data) => {
					console.log("stock gen. cb:", err, data)
				})
			})
			break
		case 'location':
			const loc = data.location.geometry.location	
			elements.push({
				image_url: data.map,
				title: data.location.name,
				buttons: [{
					type: 'web_url',
					title: 'open map',
					url: 'http://maps.google.com.tw/maps?z=12&t=m&q=loc:' + loc.lat + '+' + loc.lng
				}]
			})		
			botly.sendGeneric({
				id: sender,
				elements: elements
			}, (err, data) => {
				console.log("map gen. cb:", err, data)
			})
			break
		case 'travel':
			toTraditionalChinese.do( JSON.stringify(
				data.places.map( p => ({
					name: p.name, address: p.address
				}))
			)).then(zh => {
				const zharr = JSON.parse(zh)
				data.places.map( (p, idx) => {
					const placeType = p.types.filter(t => t !== 'point_of_interest').map(t => type_zh_tw[t]).join('/')
					console.log(placeType)
					elements.push({
						image_url: p.photoUrl,
						title: zharr[idx].name,
						subtitle: (p.rating? p.rating + ' | ':'')+ placeType + " | " + zharr[idx].address,
						item_url: "https://www.google.com.tw/search?q=" + p.name,
						buttons: [{
							type: 'web_url',
							title: 'map',
							url: 'http://maps.google.com.tw/maps?z=12&t=m&q=loc:' + p.location.lat + '+' + p.location.lng
						}]
					})
				})
				botly.sendGeneric({
					id: sender,
					elements: elements
				}, (err, data) => {
					console.log("travel cb:", err, data)
				})
			})
			break
		case 'movie':
			toTraditionalChinese.do(JSON.stringify(data)).then(zh => {
				JSON.parse(zh).movies.map(m => {
					const genre = m.genres.join('/')
					const cast = m.casts.map(m => m.name).join()
					const name = m.original_title
					if (!name.match(/[\u3400-\u9FBF]/) && elements.length < 8) elements.push({
						image_url: m.images.large,
						title: name + ' (' + m.year + ')', // m.title + '('+m.year+')',
						subtitle: "類別: " + genre + " | 主演: " + cast + " | 評價: " + m.rating.average,
						item_url: "https://www.google.com.tw/search?q=" + (m.original_title + '+' + m.year).replace(" ", '+') //m.alt
					})
				})
				request('https://api.douban.com/v2/movie/subject/' + data.movies[0].id, (err, res, body) => {
					if (err) console.log('movie sum err:', err)
					else toTraditionalChinese.do(JSON.parse(body).summary).then(zhsum => {
						const summary = zhsum.substr(0, 600)
						botly.sendText({
							id: sender,
							text: '推薦新上映: ' + summary
						}, (err, data) => {
							console.log("movies sum cb:", err, data)
						})
					})
				})
				botly.sendGeneric({
					id: sender,
					elements: elements
				}, (err, data) => {
					console.log("movies cb:", err, data)
				})
			})
			break
		case 'restaurant':
			data.restaurants.map(r => {
				const open = r.opening_hours !== undefined ? r.opening_hours.open_now ? ' | 營業中' : ' | 今日已結束營業' : ''
				if (elements.length < 4) elements.push({
					title: r.name,
					//"image_url": "",
					subtitle: r.formatted_address + open,
					buttons: [{
						title: r.rating + " / 5.0",
						type: 'postback',
						payload: 'fsdg'
					}]
				})
			})
			botly.sendAttachment({
				id: sender,
				type: 'template',
				payload: {
					template_type: 'list',
					top_element_style: 'compact',
					elements: elements,
					buttons: [{
						title: 'View More',
						type: 'postback',
						payload: 'payload'
					}]
				}
			}, (err, data) => {
				console.log("restaurants cb:", err, data)
			})
			break
		case 'review':
			console.log('to send reviews')
			const open = data.open !== undefined ? data.open ? ' | 營業中' : ' | 今日已結束營業' : ''
			const top = {
				title: data.name,
				subtitle: '地址: ' + data.address + ' | 電話: ' + data.phone + ' | 網址: ' + data.website,
				default_action: {
					type: 'web_url',
					url: data.website
				},
				buttons: [{
					type: 'web_url',
					title: data.rating + open + " | open map",
					url: data.google
				}]
			}
			elements.push(top)
			data.reviews.map(rv => {
				if (elements.length < 4) elements.push({
					//"image_url": "",
					title: rv.rating + " / 5.0",
					subtitle: rv.text
				})
			})
			botly.send({
				id: sender,
				message: {
					text: '供您參考最高評價選項'
				}
			}, (err, d) => {
				/*botly.sendAttachment({
					id: sender,
					type: 'template',
					payload: {
						template_type: 'list',
						top_element_style: 'compact',
						elements: elements,
						buttons: [{
							title: 'View More',
							type: 'postback',
							payload: 'payload'
						}]
					}
				}, (err, data) => {
					console.log("reviews list cb:", err, data)
				})*/
				const buttons = []
				if(data.website)
					buttons.push({
						type: 'web_url',
						url: data.website,
						title: 'go to website'
					})
				if(data.google)
					buttons.push({
						type: 'web_url',
						url: data.google,
						title: 'open map'
					})
				toTraditionalChinese.do(data.name + '...' + data.reviews[0].text)
					.then(zh => {
						botly.sendButtons({
							id: sender,
							text: zh.slice(0, 640),
							buttons: buttons
						}, (err, data) => {
							console.log("reviews button cb:", err, data)
						})
					})
			})//}
			break
		case 'hsr':
			toTraditionalChinese.do(data.hsr).then(zh => {
				botly.sendText({
					id: sender,
					text: zh
				}, (err, data) => {
					console.log('hsr table text send cb:', err, data)
				})
			})
			break
		case 'similarity':
			const similar_images = data.similar_images
			console.log('Similarity Images: ' + similar_images)
			botly.sendText({
				id: sender,
				text: '以下是你的明星臉哦！'
			}, (err, data) => {
				console.log('text send cb:', err, data)
			})
			for (let i=0; i<3; i++){
				elements.push({
						image_url: similar_images[i].metadata.url,
						title: '藝人 : '+similar_images[i].image_file,
						subtitle: '相似度 : '+similar_images[i].score,
						item_url: similar_images[i].metadata.url,
						buttons: [{
							type: 'web_url',
							title: '照片',
							url: similar_images[i].metadata.url
						}]
					})
			}
			botly.sendGeneric({
				id: sender,
				elements: elements
			}, (err, data) => {
				console.log("faec cb:", err, data)
			})
			/* const buttons = []
			for(var i=0;i<3;i++){
				buttons.push({
						type: 'web_url',
						url: similar_images[i].metadata.url,
						title: similar_images[i].score
					})
			}

				botly.sendButtons({
					id: sender,
					text: '以下是你的明星臉哦！',
					buttons: buttons
				}, (err, data) => {
					console.log("reviews button cb:", err, data)
				}) */
			/* botly.sendText({
				id: sender,
				text: toTraditionalChinese.do(data.hsr)
			}, (err, data) => {
				console.log('hsr table text send cb:', err, data)
			}) */
			break
		case 'text':
		default:
			console.log('textmsg', data.text)
			toTraditionalChinese.do(data.text).then(zh => {
				botly.sendText({
					id: sender,
					text: zh
				}, (err, data) => {
					console.log('default text send cb:', err, data)
				})
			})
	}
}
