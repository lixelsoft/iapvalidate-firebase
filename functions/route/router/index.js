const express = require('express');
const router = express.Router();

const data = require('./data');
router.use('/receipts', data);

module.exports = router;
