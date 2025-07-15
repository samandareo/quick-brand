const mongoose = require("mongoose");

const purchaseRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    offer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Offer",
      required: true,
    },
    phoneNo: {
      type: String,
      required: true,
      // validate: {
      //   validator: function (v) {
      //     return /^(?:\+88|01)?(?:\d{11}|\d{13})$/.test(v);
      //   },
      //   message: (props) =>
      //     `${props.value} is not a valid Bangladeshi phone number!`,
      // },
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    stateDivision: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "completed"],
      default: "pending",
    },
    adminNotes: String,
    transaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction",
    },
    processedAt: Date,
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PurchaseRequest", purchaseRequestSchema);
