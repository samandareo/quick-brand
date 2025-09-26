const mongoose = require('mongoose');

const recoverySchema = new mongoose.Schema({
    phoneNumber: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    lastAttempt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Recovery', recoverySchema);