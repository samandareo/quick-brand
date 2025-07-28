const router = require("express").Router();
const { protectUser } = require("../middlewares/auth");
const withdrawalController = require("../controllers/withdrawalController");

router.route("/manual-withdrawals").get(protectUser, withdrawalController.getUserOwnWithdrawalRequest);
router.route("/manual-withdrawals").post(protectUser, withdrawalController.createUserWithdrawalRequest);
module.exports = router;