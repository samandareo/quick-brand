const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const recoverySchema = new mongoose.Schema({
    phoneNumber: { type: String, required: true },
    attempts: { type: Number, default: 0 }
}, { timestamps: true });

recoverySchema.methods.generateRecoveryToken = function () {
    console.error(process.env.RECOVERY_JWT_SECRET);
    return jwt.sign({ id: this._id }, process.env.RECOVERY_JWT_SECRET, { expiresIn: '5m' });
}

module.exports = mongoose.model('Recovery', recoverySchema);