var express = require('express');
var router = express.Router();
const api = require('../../lib');

router
.post ('/google', api.googleReceiptValidate)
.post ('/apple', api.appleReceiptValidate)


module.exports = router;
