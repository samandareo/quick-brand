const admin = require("firebase-admin");
const User = require("../models/User");
const Admin = require("../models/Admin");
const Notification = require("../models/Notification");

// Initialize Firebase Admin (call this once at app startup)
let initialized = false;

const initializeFirebase = () => {
  if (initialized) return;

  try {
    const serviceAccount = require("./quickboandpluse-firebase-adminsdk-fbsvc-41a7d0d033.json");

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    initialized = true;
    console.log("Firebase Admin initialized");
  } catch (error) {
    console.log("Firebase initialization failed:", error);
    throw error;
  }
};

/**
 * Send notification to specific FCM tokens
 * @param {string[]} tokens - Array of FCM tokens
 * @param {object} payload - Notification payload
 * @param {string} payload.title - Notification title
 * @param {string} payload.body - Notification body
 * @param {object} [payload.data] - Additional data payload
 * @returns {Promise<{successCount: number, failureCount: number}>}
 */
const sendToTokens = async (tokens, { title, body, data = {} }) => {
  if (!initialized) initializeFirebase();

  if (!tokens || !tokens.length) {
    console.log("No FCM tokens provided");
    return { successCount: 0, failureCount: 0 };
  }

  try {
    const message = {
      notification: { title, body },
      data,
    };

    // Use sendMulticast to send a notification to multiple tokens
    const response = await admin.messaging().sendEachForMulticast({
      ...message,
      tokens,
    });

    console.log(`Sent notification to ${response.successCount} devices`);

    return {
      successCount: response.successCount,
      failureCount: response.failureCount,
    };
  } catch (error) {
    console.log("Notification send failed:", error);
    throw error;
  }
};

/**
 * Send notification to a user by ID
 * @param {string} userId - MongoDB user ID
 * @param {object} payload - Notification payload
 * @returns {Promise<{successCount: number, failureCount: number}>}
 */
const sendToUser = async (userId, payload) => {
  const user = await User.findById(userId).select("fcmTokens");
  if (!user || !user.fcmTokens?.length) {
    console.log(`User ${userId} has no FCM tokens`);
    return { successCount: 0, failureCount: 0 };
  }

  return sendToTokens(user.fcmTokens, payload);
};

/**
 * Send notification to multiple users
 * @param {string[]} userIds - Array of MongoDB user IDs
 * @param {object} payload - Notification payload
 * @returns {Promise<{successCount: number, failureCount: number}>}
 */
const sendToUsers = async (userIds, payload) => {
  const users = await User.find({ _id: { $in: userIds } }).select("fcmTokens");
  const tokens = users.flatMap((user) => user.fcmTokens || []);

  return sendToTokens(tokens, payload);
};

/**
 * Save/Update FCM token for admin user
 * @param {String} adminId - Admin MongoDB ID
 * @param {String} token - FCM token
 */
const saveAdminToken = async (req, res, next) => {
  const { adminId, token } = req.body;
  await Admin.findByIdAndUpdate(adminId, {
    $addToSet: { fcmTokens: token },
  });

  res.status(200).json({
    success: true,
    message: "FCM token saved successfully",
  });
  next();
};

/**
 * Remove FCM token (on logout/token refresh)
 * @param {String} adminId - Admin MongoDB ID
 * @param {String} token - FCM token to remove
 */
const removeAdminToken = async (req, res, next) => {
  const { adminId, token } = req.body;

  await Admin.findByIdAndUpdate(adminId, {
    $pull: { fcmTokens: token },
  });

  res.status(200).json({
    success: true,
    message: "FCM token removed successfully",
  });
  next();
};

/**
 * Send purchase notification to all admins
 * @param {Object} purchase - Purchase request object
 */
const notifyAdminsOfPurchase = async (offer, purchaseRequest) => {
  initializeFirebase();

  // 1. Get all admin tokens
  const admins = await Admin.find({}).select("fcmTokens");
  console.log(admins);

  const tokens = admins.flatMap((admin) => admin.fcmTokens).filter(Boolean);
  console.log(tokens);

  if (tokens.length === 0) return;

  // 3. Send FCM message
  const message = {
    // notification: {
    //   title: "New Purchase Request",
    //   body: `New ${offer?.title} purchase awaiting approval`,
    // },
    data: {
      title: "New Purchase Request",
      body: `New ${offer?.title} purchase awaiting approval`,
      type: "new_purchase",
      offerId: offer._id.toString(),
      url: `/purchase-requests`, // Specific URL for this notification
    },
    tokens, // Send to all admin devices
  };

  await Notification.insertOne({
    title: message.data.title,
    message: message.data.body,
    relatedEntity: purchaseRequest?._id,
    metadata: {
      offerId: offer._id,
      offerTitle: offer.title,
      purchaseRequestId: purchaseRequest?._id,
      purchaseRequestStatus: purchaseRequest?.status,
    },
  });

  try {
    const response = await admin.messaging().sendEachForMulticast(message);

    console.log(response);

    // Remove failed tokens
    if (response.failureCount > 0) {
      const failedTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) failedTokens.push(tokens[idx]);
      });

      // await Admin.updateMany(
      //   {},
      //   { $pull: { fcmTokens: { $in: failedTokens } } }
      // );
    }

    return response;
  } catch (error) {
    console.error("FCM send error:", error);
    throw error;
  }
};

const markAsRead = async (notificationIds) => {
  return await Notification.updateMany(
    { _id: { $in: notificationIds } },
    { $set: { isRead: true } },
    { new: true }
  );
};

const getAdminNotifications = async (adminId, options = {}) => {
  const { limit = 20, page = 1, unreadOnly = false } = options;

  const query = { recipient: adminId };
  if (unreadOnly) query.isRead = false;

  return Notification.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate("relatedEntity");
};

module.exports = {
  initializeFirebase,
  sendToTokens,
  sendToUser,
  sendToUsers,
  saveAdminToken,
  removeAdminToken,
  notifyAdminsOfPurchase,
  markAsRead,
  getAdminNotifications,
};
