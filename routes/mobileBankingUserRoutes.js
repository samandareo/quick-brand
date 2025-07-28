const router = require("express").Router();
const { protectUser } = require("../middlewares/auth");
const mobileBanking = require("../controllers/mobileBankingController");


router.route("/mobile-banking").get(protectUser,mobileBanking.getMobileBankings);

module.exports = router;
