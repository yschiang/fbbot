const express = require('express');
const bodyParser = require('body-parser');
const settings = require('../configs.js');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

// fbbot
const fbbot = new (require('./fbbot'))(settings.FBBOT);
const fbbotWebhookPath = settings.FBBOT.WEBHOOK.ROUTE;
const fbbotRouter = fbbot.start();
app.use(fbbotWebhookPath, fbbotRouter);

app.listen(process.env.PORT || 8080);