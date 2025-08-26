const ApiResponse = require('../utils/apiResponse');
const { createTransaction } = require('./walletController');
const Recharge = require("../models/Recharge");
const Wallet = require("../models/Wallet");
const { publishToQueue } = require("../utils/producer");


exports.rechargeUser = async (req, res) => {
    const operator = req.body.operator;
    const phoneNumber = req.body.phoneNumber;
    const amount = Number(req.body.amount);

    const userId = req.user._id;
    const session = await Wallet.startSession();
    session.startTransaction();


    try {
        const wallet = await Wallet.findOne({ user: userId }).session(session);
        if (!wallet) {
            await session.abortTransaction();
            session.endSession();
            return ApiResponse.notFound("Wallet not found").send(res);
        }
        if (wallet.balance < amount) {
            await session.abortTransaction();
            session.endSession();
            return ApiResponse.success("Insufficient wallet balance").send(res);
        }

        // Balance deducation
        wallet.balance -= amount;
        await wallet.save({ session });

        await createTransaction(
            userId,
            wallet._id,
            amount,
            "debit",
            `Recharge for ${phoneNumber} on ${operator}`,
            `ref-${Date.now()}`,
            { operator, phoneNumber }
        );

        // Create recharge record
        const saveRecharge = await Recharge.create([{
            userId,
            phoneNumber,
            amount,
            operator,
            status: "pending",
            description: `Recharge for ${phoneNumber} on ${operator} on pending`,
        }], { session });

        if (!saveRecharge) {
            await session.abortTransaction();
            session.endSession();
            return ApiResponse.error("Failed to create recharge record").send(res);
        }

        await publishToQueue({
            rechargeId: saveRecharge._id,
            userId,
            phoneNumber,
            amount,
            operator
        });

        await session.commitTransaction();
        session.endSession();

        return ApiResponse.success("Recharge request successful").send(res);
        
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        return ApiResponse.error(`An error occured while processing the recharge request: ${error.message}`).send(res);
    }
}


exports.getAllRecharges = async (req, res) => {
    try {
        const recharges = await Recharge.find().populate("userId", "name email");
        return ApiResponse.success("Recharges fetched successfully", recharges).send(res);
    } catch (error) {
        return ApiResponse.error(`An error occurred while fetching recharges: ${error.message}`).send(res);
    }
}

exports.getRecharges = async (req, res) => {
    const userId = req.user._id;

    try {
        const recharge = await Recharge.find({ userId }).populate("userId", "name email");
        if (!recharge) {
            return ApiResponse.notFound("Recharge not found").send(res);
        }
        return ApiResponse.success("Recharges fetched successfully", recharge).send(res);
    } catch (error) {
        return ApiResponse.error(`An error occurred while fetching the recharge: ${error.message}`).send(res);
    }
}