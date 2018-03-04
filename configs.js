module.exports = {

	// Config for Facebook Webhook
	"FBBOT": {
		"WEBHOOK": {
			"ROUTE": "/fbwebhook",
			"VERIFY_TOKEN": "verification",
			"ACCESS_TOKEN": "EAACWU0mUo2IBAM9v1JFG3Y3fmLzsZAWD8GMRLRivzzLHnjFZBODCqnNPCLjZCkezRd47NZAH8kaRqLLjmNsZA26xatYIXZAGQdT5L9KRhIJKDqQ5TzdoC2EFyA6ZBA97XtCRSwe0ZAeZC4ZAIVTNqUtdQ7tClVUCZC7QJLu0lBSLciq3gZDZD"
		},

		// Config for IoT Platform
		"IOT_CLIENT": {
			"ORGANIZATION_ID": "bu87bg",
			"TYPE": "d",
			"DEVICE_TYPE": "robot",
			"DEVICE_ID": "fb2",
			"USERNAME": "use-token-auth",
			"PASSWORD": "fwdJbIc494EhiDD47K",
			"TOPIC": "iot-2/evt/text/fmt/json"	
		}
	},

	"SERVICE": {
		//CHZW_URL: "http://119.81.236.205:3998/chzw"
		"CHZW_URL": "http://fbbot-services-nlp.mybluemix.net/chzw",
		"IFLY_URL": "http://119.81.236.205:3998/ifly/fb"
	}
}