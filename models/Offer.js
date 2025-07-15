const mongoose = require("mongoose");

const offerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
    },
    operator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Operator",
      required: [true, "Operator ID is required"],
    },
    offerType: {
      type: String,
      required: [true, "Offer type is required"],
      enum: ["internet", "combo", "minutes"],
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },
    discountAmount: {
      type: Number,
      required: [true, "Discount amount is required"],
      min: [0, "Discount cannot be negative"],
    },
    actualPrice: {
      type: Number,
      required: [true, "Actual price is required"],
      min: [0, "Actual price cannot be negative"],
    },
    validity: {
      type: Number,
      required: [true, "Validity is required"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Offer", offerSchema);
