const router = require('express').Router();
const { protectUser } = require('../middlewares/auth');
const incomeController = require('../controllers/incomeController');

router.get('/income', protectUser, incomeController.getUserIncome);

module.exports = router;