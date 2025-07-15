const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    relatedEntity: {
      // Reference to the purchase request
      type: mongoose.Schema.Types.ObjectId,
      ref: "PurchaseRequest",
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    metadata: {
      type: Object, // Additional data like offer details
    },
  },
  { timestamps: true }
);

// Indexes for faster queries
notificationSchema.index({ isRead: 1 });
notificationSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
