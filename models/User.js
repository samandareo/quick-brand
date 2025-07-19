const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const generateReferralCode = require("../utils/generateReferralCode");

const userSchema = new mongoose.Schema(
  {
    phoneNo: {
      type: String,
      required: [true, "Phone number is required"],
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 8,
      select: false,
    },
    email: {
      type: String,
    },
    referralCode: {
      type: String,
      unique: true,
      default: generateReferralCode,
    },
    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    wallet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wallet",
    },
    subscriptionDate: Date,
    subscriptionTransactionId: String,
    fcmTokens: [
      {
        type: String,
        select: false,
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Encrypt password before save or update
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Encrypt password on findOneAndUpdate
userSchema.pre("findOneAndUpdate", async function (next) {
  const update = this.getUpdate();
  if (update && update.password) {
    update.password = await bcrypt.hash(update.password, 12);
    this.setUpdate(update);
  }
  next();
});

// Generate JWT token
userSchema.methods.generateAuthToken = function () {
  return jwt.sign({ id: this._id,  type: "user"}, process.env.JWT_SECRET, {
    // expiresIn: process.env.JWT_EXPIRES_IN || "30d",
  });
};

// Compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
