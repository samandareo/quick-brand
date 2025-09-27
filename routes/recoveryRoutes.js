const router = require('express').Router();
const recoveryController = require('../controllers/recoveryController');
const { protectRecovery } = require('../middlewares/auth');
router.post('/', recoveryController.recovery);
router.post('/reset-password', protectRecovery, recoveryController.resetPassword);

module.exports = router;