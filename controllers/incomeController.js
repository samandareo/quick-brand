const IncomeTransaction = require('../models/IncomeTransaction');
const Income = require("../models/Income");

exports.getUserIncome = async (userId) => {
    try {
        if(!userId) {
            return "Invalid user ID!";
        }

        const income = await Income.findOne({ userId: userId });
        if (!income) {
            return "Income not found for this user!";
        }

        return "User income retrieved successfully!";
    } catch (error) {
        return "An error occurred while retrieving user income.";
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