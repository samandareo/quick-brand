const router = require('express').Router();
const recoveryController = require('../controllers/recoveryController');

router.post('/', recoveryController.recovery);

module.exports = router;