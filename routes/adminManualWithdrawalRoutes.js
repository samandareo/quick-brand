const router = require("express").Router();
const { protectAdmin, protectUser } = require("../middlewares/auth");
const withdrawalController = require("../controllers/withdrawalController");

router.route("/manual-withdrawals").get(protectAdmin, withdrawalController.getUserWithdrawalRequests);
router.route("/manual-withdrawals/:withdrawId").patch(protectAdmin, withdrawalController.updateUserWithdrawalRequest);
router.route("/manual-withdrawals/:withdrawId").get(protectAdmin, withdrawalController.getUserWithdrawalRequestById);

router.route("/manual-withdrawals").post(protectUser, withdrawalController.createUserWithdrawalRequest);
router.route("/manual-withdrawals").get(protectUser, withdrawalController.getUserOwnWithdrawalRequest);
module.exports = router;