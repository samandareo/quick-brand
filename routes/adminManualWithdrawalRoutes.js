const router = require("express").Router();
const { protectAdmin } = require("../middlewares/auth");
const withdrawalController = require("../controllers/withdrawalController");

router.route("/manual-withdrawals").get(protectAdmin, withdrawalController.getUserWithdrawalRequests);
router.route("/manual-withdrawals/:withdrawId").patch(protectAdmin, withdrawalController.updateUserWithdrawalRequest);
router.route("/manual-withdrawals/:withdrawId").get(protectAdmin, withdrawalController.getUserWithdrawalRequestById);
module.exports = router;