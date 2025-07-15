const express = require("express");
const router = express.Router();
const offerController = require("../controllers/offerController");
const { protectAdmin } = require("../middlewares/auth");

router
  .route("/")
  .post(protectAdmin, offerController.createOffer)
  .get(offerController.getOffers);

router
  .route("/:id")
  .get(offerController.getOffer)
  .patch(protectAdmin, offerController.updateOffer)
  .delete(protectAdmin, offerController.deleteOffer);

router.patch(
  "/:id/toggle-status",
  protectAdmin,
  offerController.toggleOfferStatus
);

module.exports = router;
