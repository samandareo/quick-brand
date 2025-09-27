const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { RECOVERY_JWT_SECRET } = require('../config/config');

const recoverySchema = new mongoose.Schema({
    phoneNumber: { type: String, required: true },
    attempts: { type: Number, default: 0 }
}, { timestamps: true });

recoverySchema.methods.generateRecoveryToken = function () {
    return jwt.sign({ id: this._id }, RECOVERY_JWT_SECRET, { expiresIn: '5m' });
};

module.exports = mongoose.model('Recovery', recoverySchema);