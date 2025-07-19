const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: String,
      required: true,
    },
    receiverId: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: [1000, "Message cannot exceed 1000 characters"],
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["sent", "seen"],
      default: "sent",
    },
    conversationId: {
      type: String,
      required: true,
    },
    senderType: {
      type: String,
      enum: ["user", "admin"],
      required: true,
    },
    receiverType: {
      type: String,
      enum: ["user", "admin"],
      required: true,
    },
  },
  { timestamps: true }
);

// Indexes for faster queries
messageSchema.index({ conversationId: 1, timestamp: -1 });
messageSchema.index({ senderId: 1, receiverId: 1 });
messageSchema.index({ receiverId: 1, status: 1 });
messageSchema.index({ timestamp: -1 });
messageSchema.index({ senderId: 1, timestamp: -1 });
messageSchema.index({ receiverId: 1, timestamp: -1 });

module.exports = mongoose.model("Message", messageSchema); 