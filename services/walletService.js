const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");
const mongoose = require("mongoose");
const grpc = require('@grpc/grpc-js');

module.exports = {
    GetWalletBalance: async (call, callback) => {
        try {
            const { user_id } = call.request;
            
            // Early validation without database calls
            if (!user_id || user_id.trim() === '') {
                return callback({
                    code: grpc.status.INVALID_ARGUMENT,
                    details: "User ID is required"
                });
            }

            if (!mongoose.Types.ObjectId.isValid(user_id)) {
                return callback({
                    code: grpc.status.INVALID_ARGUMENT,
                    details: "Invalid User ID format"
                });
            }

            // Optimized query with lean() for faster response
            const walletData = await Wallet.findOne({ user: user_id })
                .select('balance user') // Only select needed fields
                .lean(); // Returns plain JavaScript object (faster)

            if (!walletData) {
                return callback({
                    code: grpc.status.NOT_FOUND,
                    details: "Wallet not found"
                });
            }

            const response = {
                user_id: user_id.toString(),
                balance: walletData.balance.toString()
            };

            callback(null, response);
        } catch (error) {
            callback({
                code: grpc.status.INTERNAL,
                details: "Error retrieving wallet: " + error.message
            });
        }
    },
    
    DeductBalance: async (call, callback) => {
        let session;
        try {
            const { user_id, amount, orderId } = call.request;

            // Validate inputs first (before starting session)
            if (!user_id || !mongoose.Types.ObjectId.isValid(user_id)) {
                return callback({
                    code: grpc.status.INVALID_ARGUMENT,
                    details: "Invalid User ID"
                });
            }

            const deductAmount = parseFloat(amount);
            if (isNaN(deductAmount) || deductAmount <= 0) {
                return callback({
                    code: grpc.status.INVALID_ARGUMENT,
                    details: "Invalid amount"
                });
            }

            session = await mongoose.startSession();
            session.startTransaction();

            // Use findOneAndUpdate for atomic operation
            const walletData = await Wallet.findOneAndUpdate(
                { 
                    user: user_id,
                    balance: { $gte: deductAmount } // Ensure sufficient balance
                },
                { $inc: { balance: -deductAmount } },
                { 
                    new: true,
                    session,
                    select: 'balance user' // Only select needed fields
                }
            );

            if (!walletData) {
                await session.abortTransaction();
                return callback({
                    code: grpc.status.INVALID_ARGUMENT,
                    details: "Wallet not found or insufficient funds"
                });
            }

            // Create transaction record
            const walletTransaction = await Transaction.create([{
                user: user_id,
                wallet: walletData._id,
                amount: deductAmount,
                type: "debit",
                description: `Delivery cost deduction`,
                reference: `ref-${Date.now()}`,
                metadata: { orderId },
                status: "completed",
            }], { session });

            // Update lastTransaction (optional - remove if not critical)
            await Wallet.findByIdAndUpdate(
                walletData._id, 
                { lastTransaction: walletTransaction[0]._id },
                { session }
            );

            await session.commitTransaction();
            callback(null, { success: true });
        } catch (error) {
            if (session) {
                await session.abortTransaction();
            }
            callback({
                code: grpc.status.INTERNAL,
                details: "Error deducting balance: " + error.message
            });
        } finally {
            if (session) {
                await session.endSession();
            }
        }
    },
    
    RefundBalance: async (call, callback) => {
        let session;
        try {
            const { user_id, amount, orderId } = call.request;
            
            // Early validation
            if (!user_id || !mongoose.Types.ObjectId.isValid(user_id)) {
                return callback({
                    code: grpc.status.INVALID_ARGUMENT,
                    details: "Invalid User ID"
                });
            }

            const refundAmount = parseFloat(amount);
            if (isNaN(refundAmount) || refundAmount <= 0) {
                return callback({
                    code: grpc.status.INVALID_ARGUMENT,
                    details: "Invalid amount"
                });
            }

            session = await mongoose.startSession();
            session.startTransaction();

            // Atomic update
            const walletData = await Wallet.findOneAndUpdate(
                { user: user_id },
                { $inc: { balance: refundAmount } },
                { 
                    new: true,
                    session,
                    select: 'balance user'
                }
            );

            if (!walletData) {
                await session.abortTransaction();
                return callback({
                    code: grpc.status.NOT_FOUND,
                    details: "Wallet not found"
                });
            }

            await Transaction.create([{
                user: user_id,
                wallet: walletData._id,
                amount: refundAmount,
                type: "credit",
                description: `Refund delivery cost for order ${orderId}`,
                reference: `ref-${Date.now()}`,
                metadata: { orderId },
                status: "completed",
            }], { session });

            await session.commitTransaction();
            callback(null, { success: true });
        } catch (error) {
            if (session) {
                await session.abortTransaction();
            }
            callback({
                code: grpc.status.INTERNAL,
                details: "Error refunding balance: " + error.message
            });
        } finally {
            if (session) {
                await session.endSession();
            }
        }
    }
}