const mongoose = require("mongoose");

const incomeSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true,
    },
    fromReferral: {
        type: Number,
        default: 0,
    },
    fromShopping: {
        type: Number,
        default: 0,
    },
    totalIncome: {
        type: Number,
        default: 0,
    },
    lastTransaction: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Transaction",
    },
}, { timestamps: true });

incomeSchema.index({ userId: 1 }); // Index for userId
incomeSchema.index({ createdAt: -1 }); // Index for sorting by createdAt
incomeSchema.pre("save", function (next) {
    if (this.totalIncome < 0 || this.fromReferral < 0 || this.fromShopping < 0) {
        return next(new Error("Income values cannot be negative."));
    }
    this.totalIncome = this.fromReferral + this.fromShopping;
    next();
});

module.exports = mongoose.model("Income", incomeSchema);