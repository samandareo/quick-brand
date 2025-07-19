const mongoose = require("mongoose");

const userNotificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    pushNotification: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PushNotification",
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
    },
    receivedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Indexes for faster queries
userNotificationSchema.index({ user: 1, isRead: 1 });
userNotificationSchema.index({ pushNotification: 1 });
userNotificationSchema.index({ user: 1, createdAt: -1 });
userNotificationSchema.index({ user: 1, pushNotification: 1 }, { unique: true });

module.exports = mongoose.model("UserNotification", userNotificationSchema); 