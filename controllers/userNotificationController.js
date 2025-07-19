const UserNotification = require("../models/UserNotification");
const PushNotification = require("../models/PushNotification");
const ApiResponse = require("../utils/apiResponse");
const pushNotificationService = require("../utils/pushNotificationService");

// @desc    Get user's notifications with pagination
// @route   GET /api/v1/users/notifications
// @access  User
exports.getUserNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, isRead } = req.query;
    const skip = (page - 1) * limit;
    const userId = req.user._id;

    // Build filter
    const filter = { user: userId };
    if (isRead !== undefined) {
      filter.isRead = isRead === "true";
    }

    const userNotifications = await UserNotification.find(filter)
      .populate({
        path: "pushNotification",
        select: "title message recipientType createdAt",
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await UserNotification.countDocuments(filter);

    // Transform data for better frontend consumption
    const notifications = userNotifications.map((un) => ({
      id: un._id,
      notificationId: un.pushNotification._id,
      title: un.pushNotification.title,
      message: un.pushNotification.message,
      recipientType: un.pushNotification.recipientType,
      isRead: un.isRead,
      readAt: un.readAt,
      receivedAt: un.receivedAt,
      createdAt: un.pushNotification.createdAt,
    }));

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

// @desc    Mark single notification as read
// @route   POST /api/v1/users/notifications/:id/read
// @access  User
exports.markAsRead = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const notificationId = req.params.id;


    const userNotification = await UserNotification.findOne({
      user: userId,
      pushNotification: notificationId,
    });

    if (!userNotification) {
      return ApiResponse.notFound("Notification not found").send(res);
    }

    if (userNotification.isRead) {
      return ApiResponse.success(userNotification, "Notification already marked as read").send(res);
    }

    const updatedNotification = await pushNotificationService.markNotificationAsRead(
      userId,
      notificationId
    );

    ApiResponse.success(updatedNotification, "Notification marked as read").send(res);
  } catch (error) {
    next(error);
  }
};

// @desc    Mark all notifications as read
// @route   POST /api/v1/users/notifications/read-all
// @access  User
exports.markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const result = await pushNotificationService.markAllNotificationsAsRead(userId);

    ApiResponse.success(
      { updatedCount: result.modifiedCount },
      `${result.modifiedCount} notifications marked as read`
    ).send(res);
  } catch (error) {
    next(error);
  }
};

// @desc    Get unread notification count
// @route   GET /api/v1/users/notifications/unread-count
// @access  User
exports.getUnreadCount = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const count = await pushNotificationService.getUnreadCount(userId);

    ApiResponse.success({ unreadCount: count }).send(res);
  } catch (error) {
    next(error);
  }
};

// @desc    Get notification details
// @route   GET /api/v1/users/notifications/:id
// @access  User
exports.getNotificationDetails = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const notificationId = req.params.id;

    const userNotification = await UserNotification.findOne({
      user: userId,
      pushNotification: notificationId,
    }).populate({
      path: "pushNotification",
      select: "title message recipientType createdAt createdBy",
      populate: {
        path: "createdBy",
        select: "name",
      },
    });

    if (!userNotification) {
      return ApiResponse.notFound("Notification not found").send(res);
    }

    // Mark as read if not already read
    if (!userNotification.isRead) {
      await pushNotificationService.markNotificationAsRead(userId, notificationId);
      userNotification.isRead = true;
      userNotification.readAt = new Date();
    }

    const notification = {
      id: userNotification._id,
      notificationId: userNotification.pushNotification._id,
      title: userNotification.pushNotification.title,
      message: userNotification.pushNotification.message,
      recipientType: userNotification.pushNotification.recipientType,
      isRead: userNotification.isRead,
      readAt: userNotification.readAt,
      receivedAt: userNotification.receivedAt,
      createdAt: userNotification.pushNotification.createdAt,
      createdBy: userNotification.pushNotification.createdBy?.name || "Admin",
    };

    ApiResponse.success(notification).send(res);
  } catch (error) {
    next(error);
  }
}; 