const express = require("express");
const router = express.Router();
const pushNotificationController = require("../controllers/pushNotificationController");
const { protectAdmin } = require("../middlewares/auth");

// @route   POST /api/v1/push-notifications
// @desc    Create a new push notification
// @access  Admin
router.post("/", protectAdmin, pushNotificationController.createNotification);

// @route   GET /api/v1/push-notifications
// @desc    Get all push notifications with pagination
// @access  Admin
router.get("/", protectAdmin, pushNotificationController.getNotifications);

// @route   GET /api/v1/push-notifications/stats/overview
// @desc    Get notification statistics
// @access  Admin
router.get("/stats/overview", protectAdmin, pushNotificationController.getNotificationStats);

// @route   GET /api/v1/push-notifications/:id
// @desc    Get single push notification
// @access  Admin
router.get("/:id", protectAdmin, pushNotificationController.getNotification);

// @route   PUT /api/v1/push-notifications/:id
// @desc    Update push notification (only if not sent)
// @access  Admin
router.put("/:id", protectAdmin, pushNotificationController.updateNotification);

// @route   DELETE /api/v1/push-notifications/:id
// @desc    Delete push notification (only if not sent)
// @access  Admin
router.delete("/:id", protectAdmin, pushNotificationController.deleteNotification);

// @route   POST /api/v1/push-notifications/:id/send
// @desc    Send push notification
// @access  Admin
router.post("/:id/send", protectAdmin, pushNotificationController.sendNotification);

module.exports = router; 