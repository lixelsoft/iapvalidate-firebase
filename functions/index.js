'use strict';
const functions = require("firebase-functions");
const admin = require('firebase-admin');
const iap = require('in-app-purchase');
const express = require('express');
const cookieParser = require('cookie-parser')();
const cors = require('cors')({origin: true});
const app = express();
const iapKey = require('./keys/iapKey')
const validateFirebaseIdToken = require('./lib').validateFirebaseIdToken;

app.use(cors);
app.use(cookieParser);
app.use(validateFirebaseIdToken);
require('./route')(app);

exports.app = functions.region('asia-northeast3').https.onRequest(app);