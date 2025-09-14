const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");

module.exports = {
    GetWalletBalance: async (call, callback) => {
        try {
            const { wallet_id } = call.request;
            const walletData = await Wallet.findById(wallet_id);
            if (!walletData) {
                return callback({
                    code: grpc.status.NOT_FOUND,
                    details: "Wallet not found"
                });
            }
            const wallet = {
                wallet_id: walletData._id.toString(),
                balance: walletData.balance
            };
            callback(null, { wallet });
        } catch (error) {
            callback({
                code: grpc.status.INTERNAL,
                details: "Error retrieving wallet"
            });
        }
    },
    DeductBalance: async (call, callback) => {
        let session;
        try {
            session = await Wallet.startSession();
            session.startTransaction();

            const { wallet_id, user_id, amount, orderId } = call.request;
            const walletData = await Wallet.findById(wallet_id).session(session);
            if (!walletData) {
                return callback({
                    code: grpc.status.NOT_FOUND,
                    details: "Wallet not found"
                });
            }

            if (walletData.balance < amount) {
                return callback({
                    code: grpc.status.INVALID_ARGUMENT,
                    details: "Insufficient funds"
                });
            }

            walletData.balance -= amount;
            await walletData.save({ session });

            const walletTransaction = await Transaction.create([{
                user: user_id,
                wallet: walletData._id,
                amount: amount,
                type: "debit",
                description: `Delivery cost deduction`,
                reference: `ref-${Date.now()}`,
                metadata: { orderId },
                status: "completed",
            }], { session });

            await Wallet.findByIdAndUpdate(walletData._id, 
                { lastTransaction: walletTransaction[0]._id },
                { new: true, session }
            ).session(session);


            await session.commitTransaction();
            callback(null, { success: true });
        } catch (error) {
            if (session) {
                await session.abortTransaction();
            }
            callback({
                code: grpc.status.INTERNAL,
                details: "Error deducting balance"
            });
        } finally {
            if (session) {
                session.endSession();
            }
        }
    },
    RefundBalance: async (call, callback) => {
        let session;
        try {
            session = await Wallet.startSession();
            session.startTransaction();
            const { wallet_id, user_id, amount, orderId } = call.request;

            const walletData = await Wallet.findById(wallet_id).session(session);
            if (!walletData) {
                return callback({
                    code: grpc.status.NOT_FOUND,
                    details: "Wallet not found"
                });
            }

            walletData.balance += amount;
            await walletData.save({ session });

            const walletTransaction = await Transaction.create([{
                user: user_id,
                wallet: walletData._id,
                amount: amount,
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
                details: "Error refunding balance"
            });
        } finally {
            if (session) {
                session.endSession();
            }
        }
    }
}