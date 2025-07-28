const IncomeTransaction = require('../models/IncomeTransaction');
const Income = require("../models/Income");
const ApiResponse = require("../utils/apiResponse");


// @desc    Get user's income
// @route   GET /api/v1/users/income
// @access  User
exports.getUserIncome = async (req, res, next) => {
    try {
        const userId = req.user._id;
        if(!userId) {
            return ApiResponse.invalid("User ID is required").send(res);
        }

        const income = await Income.findOne({ user: userId }).populate({ path: 'lastTransaction', model: 'IncomeTransaction', select: 'amount type description createdAt' });

        if (!income) {
            return ApiResponse.notFound("Income not found for this user!").send(res);
        }

        return ApiResponse.success("User income retrieved successfully!", income).send(res);
    } catch (error) {
        return ApiResponse.error("An error occurred while retrieving user income.").send(res);
    }
};

exports.updateUserIncome = async (userId, fromReferral, fromShopping) => {
    try {
        const income = await Income.findOne({ user: userId });
        if (!income) {
            return "Income not found for this user!";
        }
        income.fromReferral += fromReferral;
        income.fromShopping += fromShopping;
        await income.save();

        return income;
    } catch (error) {
        return "An error occurred while updating user income.";
    }
}

exports.createIncomeTransaction = async (
  userId,
  incomeId,
  amount,
  type,
  description,
  reference,
  metadata = {}
) => {
  const incomeTransaction = await IncomeTransaction.create({
    user: userId,
    income: incomeId,
    amount,
    type,
    description,
    reference,
    metadata,
    status: "completed",
  });

  // Update income's last transaction reference
  await Income.findByIdAndUpdate(incomeId, {
    lastTransaction: incomeTransaction._id,
  });

  return incomeTransaction;
};