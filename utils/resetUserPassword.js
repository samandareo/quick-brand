const User = require("../models/User");

exports.resetUserPassword = async (phoneNo, newPassword) => {
  try {
    const user = await User.findOne({ phoneNo }).select("+password");
    if (!user) {
      return false;
    }

    user.password = newPassword;
    await user.save();

    return true;
  } catch (error) {
    next(error);
  }
};