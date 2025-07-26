const mongoose = require("mongoose");

const withdrawalSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    type: {
        type: String,
        enum: ["mobile_banking", "bank_transfer"],
        required: true,
    },
    amount: {type: Number, required: true},
    status: {
        type: String,
        enum: ["pending", "success", "rejected"],
        default: "pending",
    },

    // Mobile banking
    mobileOperator: {type: String},
    mobileNumber: {type: String},

    // Bank transfer
    bankName: {type: String},
    bankBranchName: {type: String},
    bankAccountNumber: {type: String},
    accountHolderName: {type: String},

}, {timestamps: true});

withdrawalSchema.index({ userId: 1, status: 1 }); // compound
withdrawalSchema.index({ createdAt: -1 });        // for sorting

withdrawalSchema.pre("validate", function (next) {
    if (this.type === "mobile_banking") {
        if (!this.mobileOperator || !this.mobileNumber) {
            return next(new Error("Mobile operator and number are required."));
        }
    } else if (this.type === "bank_transfer") {
        if (!this.bankName || !this.bankBranchName || !this.bankAccountNumber || !this.accountHolderName) {
            return next(new Error("All bank details are required."))
        }
    }
    next();
});

module.exports = mongoose.model("Withdraw", withdrawalSchema)