const PushNotification = require("../models/PushNotification");
const ApiResponse = require("../utils/apiResponse");
const pushNotificationService = require("../utils/pushNotificationService");

// @desc    Create a new push notification
// @route   POST /api/v1/push-notifications
// @access  Admin
exports.createNotification = async (req, res, next) => {
  try {
    const { title, message, recipientType } = req.body;

    // Validate recipient type
    const validRecipientTypes = ["all", "subscribed", "non_subscribed"];
    if (!validRecipientTypes.includes(recipientType)) {
      return ApiResponse.badRequest("Invalid recipient type").send(res);
    }

    const pushNotification = await PushNotification.create({
      title,
      message,
      recipientType,
      createdBy: req.admin._id,
    });

    ApiResponse.created(pushNotification, "Push notification created successfully").send(res);
  } catch (error) {
    next(error);
  }
};

// @desc    Get all push notifications with pagination
// @route   GET /api/v1/push-notifications
// @access  Admin
exports.getNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, recipientType } = req.query;
    const skip = (page - 1) * limit;

    // Build filter
    const filter = {};
    if (status) filter.status = status;
    if (recipientType) filter.recipientType = recipientType;

    const notifications = await PushNotification.find(filter)
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    console.log("Notifications:", notifications);

    const total = await PushNotification.countDocuments(filter);

    const result = {
      notifications,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit),
      },
    };

    ApiResponse.success(result).send(res);
  } catch (error) {
    next(error);
  }
};

// @desc    Get single push notification
// @route   GET /api/v1/push-notifications/:id
// @access  Admin
exports.getNotification = async (req, res, next) => {
  try {
    const notification = await PushNotification.findById(req.params.id)
      .populate("createdBy", "name email");

    if (!notification) {
      return ApiResponse.notFound("Push notification not found").send(res);
    }

    ApiResponse.success(notification).send(res);
  } catch (error) {
    next(error);
  }
};

// @desc    Update push notification (only if not sent)
// @route   PUT /api/v1/push-notifications/:id
// @access  Admin
exports.updateNotification = async (req, res, next) => {
  try {
    const { title, message, recipientType } = req.body;

    const notification = await PushNotification.findById(req.params.id);

    if (!notification) {
      return ApiResponse.notFound("Push notification not found").send(res);
    }

    // Check if notification is already sent
    if (notification.status === "sent") {
      return ApiResponse.badRequest("Cannot update sent notification").send(res);
    }

    // Validate recipient type if provided
    if (recipientType) {
      const validRecipientTypes = ["all", "subscribed", "non_subscribed"];
      if (!validRecipientTypes.includes(recipientType)) {
        return ApiResponse.badRequest("Invalid recipient type").send(res);
      }
    }

    const updatedNotification = await PushNotification.findByIdAndUpdate(
      req.params.id,
      { title, message, recipientType },
      { new: true, runValidators: true }
    ).populate("createdBy", "name email");

    ApiResponse.success(updatedNotification, "Push notification updated successfully").send(res);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete push notification
// @route   DELETE /api/v1/push-notifications/:id
// @access  Admin
exports.deleteNotification = async (req, res, next) => {
  try {
    const notification = await PushNotification.findById(req.params.id);

    if (!notification) {
      return ApiResponse.notFound("Push notification not found").send(res);
    }

    // Check if notification is already sent
    if (notification.status === "sent") {
      return ApiResponse.badRequest("Cannot delete sent notification").send(res);
    }

    await PushNotification.findByIdAndDelete(req.params.id);

    ApiResponse.success(null, "Push notification deleted successfully").send(res);
  } catch (error) {
    next(error);
  }
};

// @desc    Send push notification
// @route   POST /api/v1/push-notifications/:id/send
// @access  Admin
exports.sendNotification = async (req, res, next) => {
  try {
    const notification = await PushNotification.findById(req.params.id);

    if (!notification) { 
      return ApiResponse.notFound("Push notification not found").send(res);
    }

    // Check if notification is already sent
    if (notification.status === "sent") {
      return ApiResponse.badRequest("Notification is already sent").send(res);
    }

    // Send notification
    const result = await pushNotificationService.sendPushNotification(notification);

    const response = {
      notification,
      sendResult: result,
      message: `Notification sent to ${result.totalUsers} users successfully`,
    };

    ApiResponse.success(response, "Push notification sent successfully").send(res);
  } catch (error) {
    next(error);
  }
};

// @desc    Get notification statistics
// @route   GET /api/v1/push-notifications/stats/overview
// @access  Admin
exports.getNotificationStats = async (req, res, next) => {
  try {
    const stats = await PushNotification.aggregate([
      {
        $group: {
          _id: null,
          totalNotifications: { $sum: 1 },
          sentNotifications: {
            $sum: { $cond: [{ $eq: ["$status", "sent"] }, 1, 0] },
          },
          draftNotifications: {
            $sum: { $cond: [{ $eq: ["$status", "draft"] }, 1, 0] },
          },
          totalDeliveryCount: { $sum: "$deliveryCount" },
          totalReadCount: { $sum: "$readCount" },
        },
      },
    ]);

    const recipientTypeStats = await PushNotification.aggregate([
      {
        $group: {
          _id: "$recipientType",
          count: { $sum: 1 },
        },
      },
    ]);

    const result = {
      overview: stats[0] || {
        totalNotifications: 0,
        sentNotifications: 0,
        draftNotifications: 0,
        totalDeliveryCount: 0,
        totalReadCount: 0,
      },
      recipientTypeBreakdown: recipientTypeStats,
    };

    ApiResponse.success(result).send(res);
  } catch (error) {
    next(error);
  }
}; 