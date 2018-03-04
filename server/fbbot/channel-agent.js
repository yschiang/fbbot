const botly = require('botly');
const logger = require('../helper/logger') || console;

logger.debug('Entering ChannelAgent module.');


// a channel agent presents a conversation session
class ChannelAgent {

    constructor(settings) {
        this.settings = settings;
        this.botly = new botly({
            verifyToken: this.settings.WEBHOOK.VERIFY_TOKEN,
            accessToken: this.settings.WEBHOOK.ACCESS_TOKEN
        });

        this.botly.setGreetingText({
            pageId: "Chef",
            "greeting": [
                {
                    "locale": "default",
                    "text": "Hello, {{user_first_name}}!"
                }
            ]
        }, (err, body) => {

        });
    
        this.conversation = null;
    }

    greeting(sender, name) {
        this.botly.sendText({
            id: sender,
            text: 'Hello ' + name
        }, (err, data) => {
            console.log("send text cb:", err, data,"send text cb")
        });
    }

    hook(botapp) {

        // register message event handler
        this.botly.on('message', (sender, message, data) => {

            logger.log('Received message from facebook webhook.', {
                'app': sender,            // sender: the senderId
                'meta': message,      // the meatadata of the webhook message
                'customer-input': data    // the text message received from Messenger
            });

            // start conversing
            if (!botapp.userContextExists(sender)) {
                logger.log('User 1st time coming.', sender);
                this.botly.getUserProfile(sender, (err, info) => {
                    if (err) {
                        reject(err);
                    }
                    // register new visitor and say hi
                    botapp.addUserContext(sender, info);
                    logger.log('User contexts data.', botapp.userContexts);
                    this.greeting(sender,info.first_name);

                    // start converse
                    botapp.channelReceiveEventHandler(sender, message, data);
                });
            } else {
                logger.log('User re-visit.', sender);
                // start converse
                botapp.channelReceiveEventHandler(sender, message, data);
            };
        
        });

        return this.route();
    }

    sendText(userContext, text) {

        let sender = userContext.user;

        logger.log("ChannelAgent sending text.", {
            "senderId": sender,
            "userContext": userContext,
            "text": text
        });

        this.botly.sendText({
            id: sender,
            text: text
        }, (err, data) => {
            if (err) {
                logger.error("ChannelAgent error send cb.", err);
            }
            logger.log("ChannelAgent sent cb.", data);
        });
    }

    sendAudio(userContext, audioUrl) {

        let sender = userContext.user;

        this.botly.sendAttachment({
            id: sender,
            type: 'audio',
            payload: { url: audioUrl }
        }, (err, data) => {
            logger.log('Sent audio cb result.', {
                "cberror": err,
                "cbdata": data
            });
            if (data.error) {
                this.sendText(userContext,  'Facebook系統忙碌，請多試幾次哦！');
            }
        });
    }

    route() {
        return this.botly.router();
    }

}


module.exports = ChannelAgent;