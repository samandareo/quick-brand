const mongoose = require("mongoose");

const incomeTransactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    income: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Income",
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
incomeTransactionSchema.index({ user: 1 });
incomeTransactionSchema.index({ income: 1 });
incomeTransactionSchema.index({ createdAt: -1 });
incomeTransactionSchema.index({ reference: 1 }, { unique: true });

module.exports = mongoose.model("IncomeTransaction", incomeTransactionSchema);
