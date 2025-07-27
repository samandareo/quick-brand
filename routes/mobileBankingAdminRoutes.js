const router = require("express").Router();
const { protectAdmin } = require("../middlewares/auth");
const mobileBanking = require("../controllers/mobileBankingController");
const { mobileBankingUpload } = require("../utils/multerConfig");

router.route("/mobile-banking").post(protectAdmin, mobileBankingUpload.single("logo"), mobileBanking.createMobileBanking);
router.route("/mobile-banking").get(protectAdmin, mobileBanking.getMobileBankings);
router.route("/mobile-banking/:id")
  .get(protectAdmin, mobileBanking.getMobileBankingById)
  .put(protectAdmin, mobileBankingUpload.single("logo"), mobileBanking.updateMobileBanking)
  .delete(protectAdmin, mobileBanking.deleteMobileBanking);

module.exports = router;
