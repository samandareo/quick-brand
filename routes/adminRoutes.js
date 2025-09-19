const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { protectAdmin, protectUser } = require("../middlewares/auth");
const {
  saveAdminToken,
  removeAdminToken,
} = require("../utils/notificationService");
const { socialMediaUpload, sliderUpload } = require("../utils/multerConfig");

router.route("/register").post(adminController.register);
router.route("/login").post(adminController.login);

router.route("/get-all-admins").get(adminController.getAllAdmins);

router.route("/me").get(protectAdmin, adminController.getMe);

router.route("/update").patch(protectAdmin, adminController.updateAdmin);

router
  .route("/update-password")
  .patch(protectAdmin, adminController.updatePassword);

router.route("/dashboard").get(protectAdmin, adminController.getDashboardStats);

router
  .route("/purchase-requests")
  .get(protectAdmin, adminController.getPurchaseRequests);

router
  .route("/purchase-requests/:id")
  .patch(protectAdmin, adminController.updatePurchaseRequest);

router.get(
  "/subscription-amount",
  protectUser,
  adminController.getSubscriptionAmount
);

router
  .route("/notifications")
  .get(protectAdmin, adminController.getNotifications)
  .post(protectAdmin, adminController.markNotificationAsRead);

router
  .route("/tokens")
  .post(protectAdmin, saveAdminToken)
  .delete(protectAdmin, removeAdminToken);

router
  .route("/reward-info")
  .get(protectAdmin, adminController.getRewardInfo)
  .post(protectAdmin, adminController.createRewardInfo) 
  .put(protectAdmin, adminController.updateRewardInfo);

// Social media routes
router.route("/social-media").get(protectAdmin, adminController.getSocialMedia);
router.route("/social-media").post(protectAdmin, socialMediaUpload.single("logo"), adminController.createSocialMedia);
router.route("/social-media/:id")
  .get(protectAdmin, adminController.getSocialMediaById)
  .put(protectAdmin, socialMediaUpload.single("logo"), adminController.updateSocialMedia)
  .delete(protectAdmin, adminController.deleteSocialMedia);

// Slider routes
router.route("/sliders").get(protectAdmin, adminController.getSliders);
router.route("/sliders").post(protectAdmin, sliderUpload.single("image"), adminController.createSlider);
router.route("/sliders/:id")
  .get(protectAdmin, adminController.getSliderById)
  .put(protectAdmin, sliderUpload.single("image"), adminController.updateSlider)
  .delete(protectAdmin, adminController.deleteSlider);

module.exports = router;
