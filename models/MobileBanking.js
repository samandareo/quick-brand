const mongoose = require("mongoose");

const mobileBankingSchema = new mongoose.Schema({
    name: String,
    logo: String,
    isActive: {type: Boolean, default: true},
});

module.exports = mongoose.model("MobileBanking", mobileBankingSchema);