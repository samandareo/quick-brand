const Recovery = require('../models/Recovery');
const User = require('../models/User');
const ApiResponse = require('../utils/apiResponse');

exports.recovery = async (req, res) => {
    try {
        const { phoneNumber, name, balance } = req.body;

        const recoveryRecord = await Recovery.findOne({ phoneNumber });
        if (recoveryRecord) {
            const now = new Date();
            // Compare last attempt date and today's date
            const lastAttemptDate = new Date(recoveryRecord.lastAttempt);
            if (lastAttemptDate.toDateString() !== now.toDateString()) {
                recoveryRecord.attempts = 0;
            }
            if (recoveryRecord.attempts > 5) {
                return ApiResponse.badRequest("Too many recovery attempts today. Please try again tomorrow.").send(res);
            } else {
                recoveryRecord.attempts += 1;
                recoveryRecord.lastAttempt = now;
                await recoveryRecord.save();
            }
        } else {
            await Recovery.create({ phoneNumber, attempts: 1, lastAttempt: new Date() });
        }

        const user = await User.findOne({ phoneNumber }).populate('wallet');
        if (!user) {
            return ApiResponse.notFound("User not found").send(res);
        }

        if (user.name !== name || user.balance !== balance) {
            return ApiResponse.badRequest("Provided details do not match our records").send(res);
        }

        const authToken = user.generateAuthToken();

        return ApiResponse.success({ success: true, token: authToken }, "Recovery successful").send(res);
    } catch (error) {
        console.error("Recovery error:", error);
        return ApiResponse.error(`An error occurred during recovery: ${error.message}`).send(res);
    }
}