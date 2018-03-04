const winston = require('winston');
const winstonLogger = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)({
            colorize: true 
        })
    ]
});

function format(message, logContent) {
        // populate the message
        let msgObj = {
            "text": message
        }
        if (logContent) {
            msgObj.logContent = JSON.stringify(logContent);
        }

        return msgObj;
}

var logger = {
    log: function(message, data) {
        winstonLogger.info(format(message, data));
    },
    error: function(message, data) {
        winstonLogger.error(format(message, data));
    },
    // warn: function(message) {
    //     winstonLogger.warn(formatMessage(message));
    // },
    // verbose: function(message) {
    //     winstonLogger.verbose(formatMessage(message));
    // },
    // info: function(message) {
    //     winstonLogger.info(formatMessage(message));
    // },
    debug: function(message, data) {
        winstonLogger.debug(format(message, data));
    },
    // silly: function(message) {
    //     winstonLogger.silly(formatMessage(message));
    // }
};

module.exports = logger;