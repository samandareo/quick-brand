const mongoose = require("mongoose");

const pushNotificationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    message: {
      type: String,
      required: [true, "Message is required"],
      trim: true,
      maxlength: [1000, "Message cannot exceed 10000 characters"],
    },
    recipientType: {
      type: String,
      enum: ["all", "subscribed", "non_subscribed"],
      default: "all",
      required: true,
    },
    status: {
      type: String,
      enum: ["draft", "sent"],
      default: "draft",
    },
    sentAt: {
      type: Date,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
    readCount: {
      type: Number,
      default: 0,
    },
    deliveryCount: {
      type: Number,
      default: 0,
    },
    metadata: {
      type: Object,
      default: {},
    },
  },
  { timestamps: true }
);

// Indexes for faster queries
pushNotificationSchema.index({ status: 1 });
pushNotificationSchema.index({ recipientType: 1 });
pushNotificationSchema.index({ createdAt: -1 });
pushNotificationSchema.index({ createdBy: 1 });

module.exports = mongoose.model("PushNotification", pushNotificationSchema); 