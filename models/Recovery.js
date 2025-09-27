const mongoose = require('mongoose');

const recoverySchema = new mongoose.Schema({
    phoneNumber: { type: String, required: true },
    attempts: { type: Number, default: 0 }
}, { timestamps: true });

recoverySchema.methods.generateRecoveryToken = function () {
    return jwt.sign({ id: this._id }, process.env.RECOVERY_JWT_SECRET, { expiresIn: '15m' });
}

module.exports = mongoose.model('Recovery', recoverySchema);