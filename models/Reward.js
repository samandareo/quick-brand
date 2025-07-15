const mongoose = require("mongoose");

const RewardInfoSchema = new mongoose.Schema({
    referalReward: {
        type: Number,
        default: 0,
    },
    welcomeReward: {
        type: Number,
        default: 0,
    },
}, { timestamps: true });

module.exports = mongoose.model("RewardInfo", RewardInfoSchema);