const ApiResponse = rquire('../utils/apiResponse');
const { createTransaction } = require('./walletController');
const Recharge = require("../models/Recharge");
const Wallet = require("../models/Wallet");

const getWallet = async (userId) => {
    try {
        const wallet = await Wallet.findOne({ user: userId});
        return wallet;

    } catch (error) {
        return "An error occurred while checking wallet balance";
    }
}

exports.rechargeUser = async (req, res) => {
    const operator = req.body.operator;
    const phoneNumber = req.body.phoneNumber;
    const amount = req.body.amount;

    const userId = req.user._id;

    const wallet = await getWallet(userId);

    if (wallet === false) {
        return ApiResponse.notFound("Wallet not found");
    } else if (wallet.balance < amount) {
        return ApiResponse.success("Insufficient wallet balance");
    } else if (wallet === "An error occurred while checking wallet balance") {
        return ApiResponse.error("An error occurred while checking wallet balance");
    }

    try {
        await createTransaction(
            userId,
            wallet._id,
            amount,
            "recharge",
            `Recharge for ${phoneNumber} on ${operator}`,
            `ref${Date.now()}`,
            {
                operator,
                phoneNumber
            }
        );

        const saveRecharge = await Recharge.create({
            userId,
            phoneNumber,
            amount,
            operator,
            status: "pending",
            description: `Recharge for ${phoneNumber} on ${operator} on pending`,
        });

        if (!saveRecharge) {
            return ApiResponse.error("Failed to create recharge record");
        }

        return ApiResponse.success("Recharge request successful");

    } catch (error) {
        return ApiResponse.error(`An error occurred while processing the recharge request: ${error.message}`);
    }
}


exports.getAllRecharges = async (req, res) => {
    try {
        const recharges = await Recharge.find().populate("userId", "name email");
        return ApiResponse.success("Recharges fetched successfully", recharges);
    } catch (error) {
        return ApiResponse.error(`An error occurred while fetching recharges: ${error.message}`);
    }
}

exports.getRechargeById = async (req, res) => {
    const rechargeId = req.params.id;

    try {
        const recharge = await Recharge.findById(rechargeId).populate("userId", "name email");
        if (!recharge) {
            return ApiResponse.notFound("Recharge not found");
        }
        return ApiResponse.success("Recharge fetched successfully", recharge);
    } catch (error) {
        return ApiResponse.error(`An error occurred while fetching the recharge: ${error.message}`);
    }
}