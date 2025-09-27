const Recovery = require('../models/Recovery');
const User = require('../models/User');
const ApiResponse = require('../utils/apiResponse');
const { resetUserPassword } = require('./adminController'); 

exports.recovery = async (req, res) => {
    try {
        const { phoneNumber, name, balance } = req.body;

        let recoveryRecord = await Recovery.findOne({ phoneNumber });
        if (recoveryRecord) {
            if (recoveryRecord.attempts > 5) {
                const authToken = user.generateAuthToken(true);
                return ApiResponse.success({ token: authToken, recoveryFailed: true }, "Too many recovery attempts. Please try to recover with support.").send(res);
            } else {
                recoveryRecord.attempts += 1;
                await recoveryRecord.save();
            }
        } else {
            recoveryRecord = await Recovery.create({ phoneNumber, attempts: 1 });
        }

        console.log(phoneNumber, name, balance);
        const user = await User.findOne({ phoneNo: phoneNumber }).populate('wallet');
        console.log(user);
        if (!user) {
            return ApiResponse.notFound("User not found").send(res);
        }

        if (user.name !== name || user.balance !== balance) {
            return ApiResponse.badRequest("Provided details do not match our records").send(res);
        }

        const recoveryToken = recoveryRecord.generateRecoveryToken();
        return ApiResponse.success({ success: true, token: recoveryToken }, "Credentials verified successfully").send(res);
    } catch (error) {
        console.error("Recovery error:", error);
        return ApiResponse.error(`An error occurred during recovery: ${error.message}`).send(res);
    }
}

exports.resetPassword = async (req, res) => {
    try {
        const { newPassword } = req.body;
        const user = req.user;

        const resetSuccess = await resetUserPassword(user.phoneNumber, newPassword);
        if (!resetSuccess) {
            return ApiResponse.error("Failed to reset password").send(res);
        }
        return ApiResponse.success({ success: true }, "Password reset successfully").send(res);
    } catch (error) {
        console.error("Reset password error:", error);
        return ApiResponse.error(`An error occurred while resetting password: ${error.message}`).send(res);
    }
};