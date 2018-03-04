const mqtt = require('mqtt');
const logger = require('../helper/logger') || console;

class IOTClientAdapter {
    constructor (MQTT_SETTINGS) {

		const clientId = [
			MQTT_SETTINGS.TYPE,
			MQTT_SETTINGS.ORGANIZATION_ID,
			MQTT_SETTINGS.DEVICE_TYPE,
			MQTT_SETTINGS.DEVICE_ID
		].join(':');

		const connStr = 
			'mqtt://' + MQTT_SETTINGS.ORGANIZATION_ID + '.messaging.internetofthings.ibmcloud.com:1883';
		
		const connParams = {
			"clientId" : clientId,
			"keepalive" : 30,
			"username" : MQTT_SETTINGS.USERNAME,
			"password" : MQTT_SETTINGS.PASSWORD
		};

		this.connStr = connStr;
		this.connParams = connParams;
		this.client = null;
	}
	
	connect() {
		this.client = mqtt.connect(this.connStr, this.connParams);

		this.client.on('connect', () => {
			logger.log('IoT client connected to IBM Cloud.');
		
			this.client.subscribe('iot-2/cmd/+/fmt/json', (err, granted) => {
				if (err) {
					logger.error('IoT client error', err);
					return;
				}
				logger.log('IoT client subscribed event successful.', granted);
			});

			this.client.publish('iot-2/evt/init/fmt/string', JSON.stringify({text: 'connected'}));
		});

		return this.client;
	}

	// publish(topic, content) {
	// 	this.client.publish(topic, content);
	// }
}

module.exports = IOTClientAdapter;