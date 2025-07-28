const admin = require("firebase-admin");
const User = require("../models/User");
const PushNotification = require("../models/PushNotification");
const UserNotification = require("../models/UserNotification");
const { initializeFirebase, sendToTokens } = require("./notificationService");

/**
 * Substitute variables in message with user data
 * @param {string} message - Original message with variables
 * @param {object} user - User object
 * @returns {string} - Message with substituted variables
 */
const substituteVariables = (message, user) => {
  if (!message || !user) return message;

  return message
    .replace(/@name/g, user.name || "User")
    .replace(/@phoneNo/g, user.phoneNo || "")
    .replace(/@email/g, user.email || "");
};

/**
 * Get users based on recipient type
 * @param {string} recipientType - Type of recipients
 * @returns {Promise<Array>} - Array of users
 */
const getUsersByType = async (recipientType) => {
  let query = { isDeleted: false };

  switch (recipientType) {
    case "subscribed":
      query.isVerified = true;
      break;
    case "non_subscribed":
      query.isVerified = false;
      break;
    case "all":
    default:
      // No additional filters for all users
      break;
  }

  return await User.find(query).select("_id name phoneNo email fcmTokens");
};

/**
 * Send push notification to all users
 * @param {object} pushNotification - Push notification object
 * @returns {Promise<object>} - Result with success/failure counts
 */
const sendPushNotificationToAll = async (pushNotification) => {
  const users = await getUsersByType("all");
  return await sendPushNotificationToUsers(pushNotification, users);
};

/**
 * Send push notification to subscribed users only
 * @param {object} pushNotification - Push notification object
 * @returns {Promise<object>} - Result with success/failure counts
 */
const sendPushNotificationToSubscribed = async (pushNotification) => {
  const users = await getUsersByType("subscribed");
  return await sendPushNotificationToUsers(pushNotification, users);
};

/**
 * Send push notification to non-subscribed users only
 * @param {object} pushNotification - Push notification object
 * @returns {Promise<object>} - Result with success/failure counts
 */
const sendPushNotificationToNonSubscribed = async (pushNotification) => {
  const users = await getUsersByType("non_subscribed");
  return await sendPushNotificationToUsers(pushNotification, users);
};

/**
 * Send push notification to specific users
 * @param {object} pushNotification - Push notification object
 * @param {Array} users - Array of user objects
 * @returns {Promise<object>} - Result with success/failure counts
 */
const sendPushNotificationToUsers = async (pushNotification, users) => {
  if (!users || users.length === 0) {
    console.log("No users found for notification");
    return { successCount: 0, failureCount: 0, totalUsers: 0 };
  }

  // Collect all FCM tokens
  const allTokens = [];
  const userTokenMap = new Map(); // Map to track which tokens belong to which user

  users.forEach((user) => {
    if (user.fcmTokens && user.fcmTokens.length > 0) {
      user.fcmTokens.forEach((token) => {
        allTokens.push(token);
        userTokenMap.set(token, user._id);
      });
    }
    pushNotification.message = substituteVariables(pushNotification.message, user);
  });

  if (allTokens.length === 0) {
    console.log("No FCM tokens found for users");
    return { successCount: 0, failureCount: 0, totalUsers: users.length };
  }


  // Send FCM notifications
  const fcmResult = await sendToTokens(allTokens, {
    title: pushNotification.title,
    body: pushNotification.message,
    data: {
      type: "push_notification",
      notificationId: pushNotification._id.toString(),
      recipientType: pushNotification.recipientType,
    },
  });

  // Create user notification records
  const userNotificationRecords = users.map((user) => ({
    user: user._id,
    pushNotification: pushNotification._id,
    receivedAt: new Date(),
  }));

  await UserNotification.insertMany(userNotificationRecords);

  // Update push notification stats
  await PushNotification.findByIdAndUpdate(pushNotification._id, {
    deliveryCount: users.length,
    sentAt: new Date(),
    status: "sent",
  });

  return {
    successCount: fcmResult.successCount,
    failureCount: fcmResult.failureCount,
    totalUsers: users.length,
    deliveredUsers: users.length,
  };
};

/**
 * Send push notification based on recipient type
 * @param {object} pushNotification - Push notification object
 * @returns {Promise<object>} - Result with success/failure counts
 */
const sendPushNotification = async (pushNotification) => {
  initializeFirebase();

  switch (pushNotification.recipientType) {
    case "subscribed":
      return await sendPushNotificationToSubscribed(pushNotification);
    case "non_subscribed":
      return await sendPushNotificationToNonSubscribed(pushNotification);
    case "all":
    default:
      return await sendPushNotificationToAll(pushNotification);
  }
};

/**
 * Mark notification as read for a user
 * @param {string} userId - User ID
 * @param {string} notificationId - Push notification ID
 * @returns {Promise<object>} - Updated user notification
 */
const markNotificationAsRead = async (userId, notificationId) => {
  const userNotification = await UserNotification.findOneAndUpdate(
    { user: userId, pushNotification: notificationId },
    { isRead: true, readAt: new Date() },
    { new: true }
  );

  if (!userNotification) {
    throw new Error("Notification not found for user");
  }


  if (userNotification) {
    // Update read count in push notification
    await PushNotification.findByIdAndUpdate(notificationId, {
      $inc: { readCount: 1 },
    });
  }

  return userNotification;
};

/**
 * Mark all notifications as read for a user
 * @param {string} userId - User ID
 * @returns {Promise<object>} - Update result
 */
const markAllNotificationsAsRead = async (userId) => {
  const unreadNotifications = await UserNotification.find({
    user: userId,
    isRead: false,
  }).select("pushNotification");

  const result = await UserNotification.updateMany(
    { user: userId, isRead: false },
    { isRead: true, readAt: new Date() }
  );

  // Update read counts for all affected notifications
  if (result.modifiedCount > 0) {
    const notificationIds = unreadNotifications.map((un) => un.pushNotification);
    
    await PushNotification.updateMany(
      { _id: { $in: notificationIds } },
      { $inc: { readCount: 1 } }
    );
  }

  return result;
};

/**
 * Get unread notification count for a user
 * @param {string} userId - User ID
 * @returns {Promise<number>} - Unread count
 */
const getUnreadCount = async (userId) => {
  return await UserNotification.countDocuments({
    user: userId,
    isRead: false,
  });
};

module.exports = {
  substituteVariables,
  getUsersByType,
  sendPushNotificationToAll,
  sendPushNotificationToSubscribed,
  sendPushNotificationToNonSubscribed,
  sendPushNotificationToUsers,
  sendPushNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadCount,
}; 