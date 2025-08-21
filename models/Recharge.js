const mongoose = require("mongoose");

const rechargeSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    phoneNumber: { type: String, required: true },
    amount: {type: String, required: true },
    operator: { type: String, required: true },
    status: {type: String, enum: ["pending", "completed", "failed"], default: "pending"},
    description: { type: String, default: "" },
}, {timestamps: true});

rechargeSchema.index({ userId: 1 });
rechargeSchema.index({ phoneNumber: 1 });
rechargeSchema.index({ status: 1 });
rechargeSchema.index({ createdAt: -1 }); // descending order for recent queries

module.exports = mongoose.model("Recharge", rechargeSchema);