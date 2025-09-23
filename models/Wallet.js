const mongoose = require("mongoose");

const walletSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    balance: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    lastTransaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction",
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

walletSchema.index({ user: 1, _id: 1 });

// Pre-save hook to ensure balance doesn't go negative
walletSchema.pre("save", function (next) {
  if (this.balance < 0) {
    throw new Error("Wallet balance cannot be negative");
  }
  next();
});

module.exports = mongoose.model("Wallet", walletSchema);
