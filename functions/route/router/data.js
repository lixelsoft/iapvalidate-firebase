'use strict'

var express = require('express');
var router = express.Router();
const api = require('../../lib');

router
.post ('/welcome', api.checkFreePackage, api.SendFreePackage)

// * Android 
.post ('/google/currency', api.googleReceiptValidate, api.checkRewardedReceipt, api.checkDoubleProduct, api.sendCurrencyReward)
.post ('/google/package/onetime', api.googleReceiptValidate, api.checkRewardedReceipt, api.checkOnetimePackage, api.sendOnetimePackage)
.post ('/google/package/daily', api.googleReceiptValidate, api.checkRewardedReceipt, api.checkDoubleProduct, api.sendDailyPackage)
.post ('/google/package/event', api.googleReceiptValidate, api.checkRewardedReceipt, api.checkDoubleProduct, api.sendOnetimePackage)

// * IPhone
.post ('/apple/currency', api.appleReceiptValidate, api.checkRewardedReceipt, api.checkDoubleProduct, api.sendCurrencyReward)
.post ('/apple/package/onetime', api.appleReceiptValidate, api.checkRewardedReceipt, api.checkOnetimePackage, api.sendOnetimePackage)
.post ('/apple/package/daily', api.appleReceiptValidate, api.checkRewardedReceipt, api.checkTodayExpired, api.sendDailyPackage)
.post ('/apple/package/event', api.googleReceiptValidate, api.checkRewardedReceipt, api.checkDoubleProduct, api.sendOnetimePackage)


// * Unity Test
// .post ('/dailyTest', api.unityTestValidate, api.sendDailyPackage)

module.exports = router;
