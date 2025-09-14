const User = require('../models/User');

module.exports = {
    GetUser: async (call, callback) => {
        try {
            const { user_id } = call.request;
            const userData = await User.findById(user_id);
            if (!userData) {
                return callback({
                    code: grpc.status.NOT_FOUND,
                    details: "User not found"
                });
            }
            const user = {
                id: userData._id.toString(),
                phoneNo: userData.phoneNo,
                name: userData.name,
                password: userData.password,
                email: userData.email,
                wallet_id: userData.wallet.toString(),
                fcm_token: userData.fcmTokens
            };

            callback(null, { user });
        } catch (error) {
            callback({
                code: grpc.status.INTERNAL,
                details: "Error retrieving user"
            });
        }
    }

}