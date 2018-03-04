/**
 * A context manager for storing users and their messages. 
 * 
 */
 
class Context {

    constructor(senderId, context, msg) {
        if (!senderId || senderId === '') {
            throw "senderId is required for creating a context.";
        }
        this.user = senderId;
        this.context = context || {};
        this.msg = msg || {};
    }
}

module.exports = Context;