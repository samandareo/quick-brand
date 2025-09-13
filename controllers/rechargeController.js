const ApiResponse = require('../utils/apiResponse');
const { createTransaction } = require('./walletController');
const Recharge = require("../models/Recharge");
const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");
const RechargeOperator = require("../models/RechargeOperators")
const { publishToQueue } = require("../utils/producer");


exports.rechargeUser = async (req, res) => {
    const operator = req.body.operator;
    const phoneNumber = req.body.phoneNumber;
    const amount = Number(req.body.amount);

    const userId = req.user._id;
    let session;

    try {
        session = await Wallet.startSession();
        session.startTransaction();

        const wallet = await Wallet.findOne({ user: userId }).session(session);
        if (!wallet) {
            throw new Error("Wallet not found");
        }
        if (wallet.balance < amount) {
            throw new Error("Insufficient wallet balance");
        }

        // Balance deduction
        wallet.balance -= amount;
        await wallet.save({ session });

        const walletTransaction = await Transaction.create([{
            user: userId,
            wallet: wallet._id,
            amount: amount,
            type: "debit",
            description: `Recharge for ${phoneNumber} on ${operator}`,
            reference: `ref-${Date.now()}`,
            metadata: { operator, phoneNumber },
            status: "completed",
        }], { session });

        await Wallet.findByIdAndUpdate(wallet._id, 
            { lastTransaction: walletTransaction[0]._id },
            { new: true, session }
        ).session(session);

        const saveRecharge = await Recharge.create([{
            userId,
            phoneNumber,
            amount,
            operator,
            status: "pending",
            description: `Recharge for ${phoneNumber} on ${operator} on pending`,
        }], { session });

        if (!saveRecharge) {
            throw new Error("Failed to create recharge record");
        }

        // await publishToQueue({
        //     rechargeId: saveRecharge[0]._id,
        //     userId,
        //     phoneNumber,
        //     amount,
        //     operator
        // });

        await session.commitTransaction();
        return ApiResponse.success("Recharge request successful").send(res);

    } catch (error) {
        if (session) {
            await session.abortTransaction();
            session.endSession();
        }
        return ApiResponse.error(`An error occurred while processing the recharge request: ${error.message}`).send(res);
    } finally {
        if (session) {
            session.endSession();
        }
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


// Recharge Operators

// Admin get all recharge operators
exports.getAllRechargeOperators = async (req, res) => {
    try {
        const rechargeOperators = await RechargeOperator.find();
        if (!rechargeOperators) {
            return ApiResponse.notFound("Recharge Operators are not found!").send(res);
        }
        return ApiResponse.success(rechargeOperators).send(res);
    } catch (error) {
        return ApiResponse.error(`An error occured while fetching the recharge operators: ${error.message}`).send(res);
    }
}

exports.getRechargeOperatorById = async (req, res) => {
    try {
        const rechargeOperator = await RechargeOperator.findById(req.params.id);
        if (!rechargeOperator) {
            return ApiResponse.notFound("Recharge Operators are not found!").send(res);
        }
        return ApiResponse.success(rechargeOperator).send(res);
    } catch (error) {
        return ApiResponse.error(`An error has occured: ${error.message}`).send(res);
    }
}

// User can get recharge operators
exports.getRechargeOperators = async (req, res) => {
    try{
        const { isActive } = req.query;
        const query = {};

        if (isActive) {
            query.isActive = isActive === "true";
        }

        const rechargeOperators = await RechargeOperator.find().sort({ createdAt: 1});

        if (!rechargeOperators) {
            return ApiResponse.notFound("Recharge operators are not found!").send(res);
        }
        ApiResponse.success(rechargeOperators).send(res);
    } catch (error) {
        return ApiResponse.error(`An error occured while fetching the recharge operators: ${error.message}`).send(res);
    }
}

// Admin creates recharge operator
exports.createRechargeOperator = async (req, res) => {
    const { operatorName, isActive, operatorCode } = req.body;

    try {
        if (!operatorName || typeof isActive === "undefined" || !operatorCode) {
            return ApiResponse.invalid("Missing required fields").send(res);
        }

        const savedRechargeOperator = await RechargeOperator.create({
            operatorName,
            isActive,
            operatorCode
        });

        if (!savedRechargeOperator) {
            return ApiResponse.invalid("Recharge operator did not create successfully").send(res);
        }

        ApiResponse.success("Recharge operator created successfully").send(res);
    } catch (error) {
        return ApiResponse.error(`An error occured: ${error.message}`).send(res);
    }
}

// Admin updates recharge operator
exports.updateRechargeOperator = async (req, res) => {
    const { id } = req.params;
    const { operatorName, isActive, operatorCode } = req.body;

    try {
        const rechargeOperator = await RechargeOperator.findById(id);
        if (!rechargeOperator) {
            return ApiResponse.notFound("Recharge operator not found").send(res);
        }

        if (operatorName !== undefined) rechargeOperator.operatorName = operatorName;
        if (isActive !== undefined) rechargeOperator.isActive = isActive;
        if (operatorCode !== undefined) rechargeOperator.operatorCode = operatorCode;

        await rechargeOperator.save();

        return ApiResponse.success("Recharge operator updated successfully", rechargeOperator).send(res);
    } catch (error) {
        return ApiResponse.error(`An error occured while updating the recharge operator: ${error.message}`);
    }
}

exports.toggleRechargeOperatorStatus = async (req, res) => {
    try {
        const rechargeOperator = await RechargeOperator.findById(req.params.id);
        if (!rechargeOperator) {
            return ApiResponse.notFound("Operator not found").send(res);
        }

        rechargeOperator.isActive = !rechargeOperator.isActive;
        await rechargeOperator.save();

        ApiResponse.success(
            rechargeOperator,
            `Operator ${rechargeOperator.isActive ? "activated" : "deactivated"} successfully`
        ).send(res);
    } catch (error) {
        return ApiResponse.error(`An error has occured: ${error.message}`).send(res);
    }
}

exports.deleteRechargeOperator = async (req, res) => {
    const { id } = req.params;

    try {
        const rechargeOperator = await RechargeOperator.findById(id);
        if (!rechargeOperator){
            return ApiResponse.notFound("Recharge operator not found!").send(res);
        }

        await rechargeOperator.deleteOne();

        ApiResponse.success(null, "Recharge operator deleted successfully!").send(res);
    } catch (error) {
        return ApiResponse.error(`An error has occured: ${error.message}`).send(res);
    }
}