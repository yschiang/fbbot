// Simple Facebook Messenger bot package at https://www.npmjs.com/package/botly
const botly = require('botly');
const logger = require('../helper/logger') || console;
const ChannelAgent = require('./channel-agent');

logger.debug('Entering fbbot index module.');


// Conversation BOT
class BotApp {

    constructor(BOT_SETTINGS) {
        this.userContexts = {};
        this.settings = BOT_SETTINGS;
        this.iotClient = null;
        this.channel = null;
        this.conversation = null;
    }

    start() {

        logger.debug('IOT Client Connecting...');
        const iot = new (require('../iot-client'))(this.settings.IOT_CLIENT);
        try {
            this.iotClient = iot.connect();
            this.registerIotResponseHandler(); // register iot responses
        } catch (e) {
            // should reconnect
            throw e;
        }

        // start channel agent
        logger.debug('Initiate ChannelAgent...');
        this.channel = new ChannelAgent(this.settings);

    
        return this.channel.hook(this);
    }

    sendIotRequestEvent(topic, payload) {
        this.iotClient.publish(topic, payload);
    }

    registerIotResponseHandler() {
        const { watch, unwatch } = require("melanke-watchjs");

        logger.log('Enter registerIotResponseHandler()');
        this.iotClient.on('message', (t, bufferP) => {
            
            const payload = JSON.parse(bufferP);
            const sender = payload.prev.sender;

            logger.log('Received iot payload from topic.', {
                "topic": t,
                "payload": payload,
                "channel": "facebook",
                "channel-sender": sender
            });

            if (sender && this.userContextExists(sender)) {

                let ctx = this.getUserContext(sender);
                ctx.context.oldConversation = payload.oldConversation;
    
                const mid = payload.prev.mid;
                const msg = ctx.msg[mid];
                logger.log('msg:' + msg);
                if(msg) {
                    if (payload.type === 'text' && !payload.data.hasAnswer) {
                        if (!msg.rc) {
                            watch(msg, 'rc', (prop, action, rc) => {
                                logger.log('Watch change.', {
                                    "msg": msg,
                                    "prop": prop,
                                    "action": action,
                                    "rc": rc
                                });
                                unwatch(msg, 'rc');
                                if (rc) {
    
                                } else {
                                    this.sendChannelResponse(sender, payload);
                                }
                            });
                        } else if (!msg.rc) {
                            this.sendChannelResponse(sender, payload);
                        }
                    } else {
                        this.sendChannelResponse(sender, payload);
                    }
                }
            }
        });
    
    }

    sendChannelResponse(sender, payload) {

        
        const responseHandler = require('./channel-response-handler')(this.channel);
        const userCtx = this.userContexts[sender];
        responseHandler(payload, userCtx);
    }

    channelReceiveEventHandler(sender, message, data) {

        const requestHandler = require('./channel-request-handler')(this, this.channel);
        const userCtx = this.userContexts[sender]; // userCtx example { "sender": .. , "msg": .., "context": .. }
        
        requestHandler(userCtx, message, data);
    }

    // Helpers

    getIotClient() {
        return this.iotClient;
    }

    addUserContext(key, contextdata) {
        let sender = key;
        let Context = require('./context');
        let ctx = new Context(sender, contextdata);
        this.userContexts[key] = ctx;
        logger.log('User context added.', {
            "key": sender,
            "newContext": ctx,
            "currentContexts": this.userContexts
        });
    }

    userContextExists(key) {
        return this.userContexts[key] ? true : false;
    }

    getUserContext(key) {
        return this.userContexts[key];
    }
}

class Converse {
    constructor() {

    }
}

module.exports = BotApp;