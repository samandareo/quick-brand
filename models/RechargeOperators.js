const mongoose = require("mongoose");

const rechargeOperatorSchema = new mongoose.Schema({
  operatorName: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  operatorCode: { type: String, required: true }
}, { timestamps: true });


rechargeOperatorSchema.index({ operatorName: 1 }, { unique: true });
rechargeOperatorSchema.index({ operatorCode: 1 }, { unique: true });

module.exports = mongoose.model("RechargeOperator", rechargeOperatorSchema);
