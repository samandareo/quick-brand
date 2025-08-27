const mongoose = require("mongoose");

const rechargeOperatorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  operatorCode: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model("RechargeOperator", rechargeOperatorSchema);
