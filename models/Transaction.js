const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    wallet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wallet",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    type: {
      type: String,
      enum: ["credit", "debit"],
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    reference: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "reversed", "rejected", "refunded", "cancelled", "success"],
      default: "pending",
    },
    metadata: {
      type: Object,
      default: {},
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Indexes for faster querying
transactionSchema.index({ user: 1 });
transactionSchema.index({ wallet: 1 });
transactionSchema.index({ createdAt: -1 });
transactionSchema.index({ reference: 1 }, { unique: true });

module.exports = mongoose.model("Transaction", transactionSchema);
