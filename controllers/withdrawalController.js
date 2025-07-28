const { mongoose } = require("mongoose");
const ApiResponse = require("../utils/apiResponse");
const { createTransaction } = require("./walletController");
const { v4: uuidv4 } = require("uuid");

const Wallet = require("../models/Wallet");
const Withdraw = require("../models/WithdrawalModel");


const getWallet = async (userId) => {
  try {
    const wallet = await Wallet.findOne({ user: userId });
    if (!wallet) {
      return null;
    }
    return wallet;
  } catch (error) {
    console.error("Error fetching wallet:", error);
    return null;
  }
};

// @desc Admin get user withdrawal requests
// @route GET /api/v1/admins/manual-withdrawals
// @access Admin
exports.getUserWithdrawalRequests = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 20;
        const skip = (page - 1) * limit;

        // Build filter object
        const filter = {};
        if (req.query.status) {
            filter.status = req.query.status;
        }
        if (req.query.type) {
            filter.type = req.query.type;
        }

        const [withdrawals, total] = await Promise.all([
            Withdraw.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
            Withdraw.countDocuments(filter)
        ]);

        if (!withdrawals || withdrawals.length === 0) {
            return ApiResponse.notFound("Withdrawal requests not found!").send(res);
        }

        const pagination = {
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            totalItems: total,
            itemsPerPage: limit
        };

        ApiResponse.success({ withdrawals, pagination }).send(res);
    } catch (err) {
        ApiResponse.error(err).send(res);
    }
}

// @desc Admin/User can get withdrawal request by ID
// @route GET /api/v1/admins|users/manual-withdrawals/:withdrawId
// @access Admin and User
exports.getUserWithdrawalRequestById = async (req, res, next) => {
    const withdrawId = req.params.withdrawId;
    if(!withdrawId) {
        ApiResponse.invalid("Invalid withdrawal ID!").send|(res);
    }

    try {
        const withdrawal = await Withdraw.findById(withdrawId);
        if(!withdrawal) {
            ApiResponse.notFound("Withdrawal request not found!").send(res);
        }

        ApiResponse.success(withdrawal).send(res);
    } catch(err) {
        ApiResponse.error(err).send(res);
    }
}

// @desc Admin update withdraw status
// @route PATCH /api/v1/admins/manual-withdrawals/:withdrawId
// @access Admin
exports.updateUserWithdrawalRequest = async (req, res, next) => {
    const { withdrawId } = req.params;
    const { status } = req.body;
    
    if(!mongoose.Types.ObjectId.isValid(withdrawId)) {
       return ApiResponse.invalid("Invalid withdrawal ID").send(res);
    }

    const allowedStatuses = ["pending", "success", "rejected"];
    if(!allowedStatuses.includes(status)){
        return ApiResponse.invalid("Invalid status value").send(res);
    }

    try {
        const withdrawal = await Withdraw.findById(withdrawId);

        if(!withdrawal){
            return ApiResponse.notFound("Withdrawal request not found!").send(res);
        }

        withdrawal.status = status;
        await withdrawal.save();

        if(status === "rejected") {
            const wallet = await getWallet(withdrawal.userId);
            if(!wallet) {
                return ApiResponse.notFound("Wallet not found").send(res);
            }

            wallet.balance += withdrawal.amount;
            await wallet.save();
            await createTransaction(
                withdrawal.userId,
                wallet._id,
                withdrawal.amount,
                "credit",
                `Withdrawal request rejected. Amount refunded: ${withdrawal.amount}`,
                `withdrawal_reject_${withdrawal._id}`,
                { withdrawalId: withdrawal._id }
            );
            ApiResponse.success(null, "Withdrawal request rejected and amount refunded").send(res);
        }
        ApiResponse.success(withdrawal, "Withdrawal request updated successfully").send(res);
    } catch (err) {
        ApiResponse.error(err).send(res);
    }
}

// @desc User get own withdrawal requests
// @route GET /api/v1/users/manual-withdrawals
// @access User
exports.getUserOwnWithdrawalRequest = async (req, res, next) => {
    const userId = req.user._id;
    console.log("Fetching withdrawal requests for user:", userId);
    if (!userId) {
        ApiResponse.invalid("Invalid user ID!").send(res);
    }

    try {
        const userWithdrawals = await Withdraw.find({ userId: userId });

        if (!userWithdrawals) {
            ApiResponse.notFound("User withdrawals not found!").send(res);
        }
        ApiResponse.success(userWithdrawals).send(res);
    } catch (err) {
        ApiResponse.error(err).send(res);
    }
}



// @desc User create withdrawal request
// @route POST /api/v1/users/manual-withdrawals
// @access User
exports.createUserWithdrawalRequest = async (req, res, next) => {
    const { amount, type, mobileOperator, mobileNumber, bankName, bankBranchName, bankAccountNumber, accountHolderName } = req.body;
    const userId = req.user._id;
    console.log("Creating withdrawal request for user:", userId);
    try {
        const wallet = await getWallet(userId);

        if (!wallet) {
            console.log("Wallet not found for user:", userId);
            return ApiResponse.notFound("Wallet not found!").send(res);
        }

        if (wallet.balance < amount) {
            console.log("Insufficient balance for user:", userId, "Balance:", wallet.balance, "Requested amount:", amount);
            return ApiResponse.invalid("Insufficient balance!").send(res);
        }

        const newWithdrawalRequest = await Withdraw.create({
            userId,
            type,
            amount,
            mobileOperator,
            mobileNumber,
            bankName,
            bankBranchName,
            bankAccountNumber,
            accountHolderName
        });

        wallet.balance -= amount;
        await wallet.save();

        const refId = uuidv4();
        await createTransaction(
            userId,
            wallet._id,
            amount,
            "credit",
            `Withdrawal request created. Amount deducted: ${amount}`,
            `withdrawal_created_${refId}`,
            { userId: userId }
        );

        return ApiResponse.created(newWithdrawalRequest, "Withdrawal Request created successfully").send(res);
    } catch (err) {
        console.error("Error creating withdrawal request:", err);
        return ApiResponse.error(err).send(res);
    }
};