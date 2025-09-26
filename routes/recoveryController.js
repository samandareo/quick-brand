const router = require('express').Router();
const recoveryController = require('../controllers/recoveryController');

router.post('/recover', recoveryController.recovery);

module.exports = router;