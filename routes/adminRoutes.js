const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { protectAdmin, protectUser } = require("../middlewares/auth");
const {
  saveAdminToken,
  removeAdminToken,
} = require("../utils/notificationService");

router.route("/login").post(adminController.login);

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

module.exports = router;
