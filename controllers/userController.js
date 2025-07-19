const Transaction = require("../models/Transaction");
const User = require("../models/User");
const Wallet = require("../models/Wallet");
const RewardInfo = require("../models/Reward");
const SocialMedia = require("../models/SocialMedia");
const Slider = require("../models/Slider");

const ApiResponse = require("../utils/apiResponse");
const { createTransaction } = require("../controllers/walletController");

// @desc    Register a new user
// @route   POST /api/v1/users/register
exports.register = async (req, res, next) => {
  try {
    const { phoneNo, name, password, referralCode, fcmToken } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      // $or: [{ phoneNo }, { email }],
      phoneNo,
      isDeleted: false,
    });
    if (existingUser) {
      return ApiResponse.error(
        "User already exists with this phone number",
        400
      ).send(res);
    }

    // Check if referral code is valid
    let referredBy = null;
    if (referralCode) {
      const referringUser = await User.findOne({
        referralCode,
        isDeleted: false,
      });
      if (!referringUser) {
        return ApiResponse.error("Invalid referral code", 400).send(res);
      }
      referredBy = referringUser._id;
    }

    // Create user
    const user = await User.create({
      phoneNo,
      name,
      password,
      referredBy,
      fcmTokens: fcmToken ? [fcmToken] : [],
    });

    // Create wallet for the user
    const wallet = await Wallet.create({ user: user._id });

    // Generate token
    const token = user.generateAuthToken();

    // Save user with wallet reference
    user.wallet = wallet._id;
    user.email = `user_${user?._id}@noemail.arifmart.com`; // Generate a dummy email
    await user.save();

    // Remove password from output
    user.password = undefined;

    // If referred, add bonus to both users' wallets
    if (referredBy) {
      await this.handleReferralBonus(user._id, referredBy);
    }

    ApiResponse.created({ token, user }, "User registered successfully").send(
      res
    );
  } catch (error) {
    next(error);
  }
};

// @desc    Handle referral bonus
// @route   (Internal)
exports.handleReferralBonus = async (newUserId, referrerId) => {
  try {
    // Get wallets
    const [referrerWallet, newUserWallet] = await Promise.all([
      Wallet.findOne({ user: referrerId, isDeleted: false }),
      Wallet.findOne({ user: newUserId, isDeleted: false }),
    ]);

    if (!referrerWallet || !newUserWallet) {
      console.error("One or both wallets not found");
      return;
    }

    const rewardInfo = await RewardInfo.findOne({});

    // Add bonus to referrer's wallet
    referrerWallet.balance += rewardInfo.referalReward; // Example: 10 units bonus
    await referrerWallet.save();

    // Create transaction for referrer
    await createTransaction(
      referrerId,
      referrerWallet._id,
      rewardInfo.referalReward,
      "credit",
      "Referral bonus",
      `REF-${newUserId}`,
      { referredUser: newUserId }
    );

    // Add bonus to new user's wallet
    newUserWallet.balance += referalInfo.welcomeReward; // Example: 50 units bonus for new user
    await newUserWallet.save();

    // Create transaction for new user
    await createTransaction(
      newUserId,
      newUserWallet._id,
      rewardInfo.welcomeReward,
      "credit",
      "Welcome referral bonus",
      `REF-${referrerId}`,
      { referrer: referrerId }
    );

    console.log("Referral bonuses processed successfully");
  } catch (error) {
    console.error("Error handling referral bonus:", error);
    // You might want to implement retry logic or error reporting here
  }
};

// @desc    Get user referalls
// @route   GET /api/v1/users/referrals
exports.getReferrals = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return ApiResponse.notFound("User not found").send(res);
    }
    
    const totalReferrals = await User.countDocuments({ referredBy: user._id });

    const todayReferrals = await User.find({
      referredBy: user._id,
      createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
    });

    const rewardInfo = await RewardInfo.findOne({});

    const data = {
      reward: rewardInfo.referalReward,
      referralCode: user.referralCode,
      total_referral_count: totalReferrals,
      recent_referrals: todayReferrals,
    }

    ApiResponse.success(data).send(res);
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/v1/users/login
exports.login = async (req, res, next) => {
  try {
    const { phoneNo, password, fcmToken } = req.body;

    // 1. Check if user exists
    const user = await User.findOne({ phoneNo, isDeleted: false }).select(
      "+password"
    );
    if (!user) {
      return ApiResponse.unauthorized("Invalid credentials").send(res);
    }

    // 2. Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return ApiResponse.unauthorized("Invalid credentials").send(res);
    }

    // 3. Generate token
    const token = user.generateAuthToken();

    if (fcmToken)
      await User.findByIdAndUpdate(user?._id, {
        $addToSet: { fcmTokens: fcmToken },
      });

    // 4. Remove password from output
    user.password = undefined;

    ApiResponse.success({ token, user }, "User logged in successfully").send(
      res
    );
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user
// @route   GET /api/v1/users/me
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate(
      "wallet",
      "balance lastTransaction"
    );
    ApiResponse.success(user).send(res);
  } catch (error) {
    next(error);
  }
};

// @desc    Update user details
// @route   PATCH /api/v1/users/update
exports.updateUser = async (req, res, next) => {
  try {
    const fieldsToUpdate = {
      name: req.body.name,
      phoneNo: req.body.phoneNo,
      password: req.body.password,
      isActive: req.body.isActive,
    };

    let id = req?.user?._id;
    if (!id) id = req?.params?.id;

    if (!id) return ApiResponse.badRequest("Unauthorized").send(res);

    if (req.body?.fcmToken)
      fieldsToUpdate.$addToSet = { fcmTokens: req.body.fcmToken };

    const user = await User.findByIdAndUpdate(id, fieldsToUpdate, {
      new: true,
      runValidators: true,
    }).populate("wallet", "balance lastTransaction");

    if (req.body?.walletBalance) {
      const wallet = await Wallet.findOne({ user: user._id, isDeleted: false });
      if (!wallet) {
        return ApiResponse.notFound("Wallet not found").send(res);
      }
      wallet.balance = req.body.walletBalance;
      await wallet.save();
      user.wallet.balance = req.body.walletBalance;
    }

    ApiResponse.success(user, "User updated successfully").send(res);
  } catch (error) {
    if (error.name === "ValidationError") {
      return ApiResponse.badRequest(error.message).send(res);
    }
    if (error.code === 11000) {
      return ApiResponse.error("Phone number already exists", 400).send(res);
    }
    next(error);
  }
};

// @desc    Update user password
// @route   PATCH /api/v1/users/update-password
exports.updatePassword = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("+password");

    // Check current password
    const isMatch = await user.comparePassword(req.body.currentPassword);
    if (!isMatch) {
      return ApiResponse.unauthorized("Current password is incorrect").send(
        res
      );
    }

    user.password = req.body.newPassword;
    await user.save();

    user.password = undefined;
    ApiResponse.success(user, "Password updated successfully").send(res);
  } catch (error) {
    next(error);
  }
};

// @desc    Get user by ID (Admin only)
// @route   GET /api/v1/users/:id
exports.getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).populate(
      "wallet",
      "balance lastTransaction"
    );
    if (!user) {
      return ApiResponse.notFound("User not found").send(res);
    }
    ApiResponse.success(user).send(res);
  } catch (error) {
    next(error);
  }
};

// @desc    Get all users (Admin only)
// @route   GET /api/v1/users
exports.getUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const search = req.query.search;
    let query = { isDeleted: false };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { phoneNo: { $regex: search, $options: "i" } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .skip(skip)
        .limit(limit)
        .populate("wallet", "balance lastTransaction"),
      User.countDocuments(query),
    ]);

    ApiResponse.success({
      users,
      total,
      page,
      pages: Math.ceil(total / limit),
      limit,
    }).send(res);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Soft delete a user (set isDeleted to true)
 * @route   DELETE /api/v1/users/:id
 */
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, {
      isDeleted: true,
    });
    if (!user) {
      return ApiResponse.notFound("User not found").send(res);
    }
    ApiResponse.success(null, "User deleted successfully").send(res);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Logout user (remove FCM token)
 * @route   POST /api/v1/users/logout
 */
exports.logout = async (req, res, next) => {
  try {
    const { fcmToken } = req.body;

    if (fcmToken) {
      await User.findByIdAndUpdate(req.user._id, {
        $pull: { fcmTokens: fcmToken },
      });
    }
    ApiResponse.success(null, "User logged out successfully").send(res);
  } catch (error) {
    next(error);
  }
};

// @desc    Get social media links
// @route   GET /api/v1/users/social-media
exports.getSocialMedia = async (req, res, next) => {
  try {
    const socialMedia = await SocialMedia.find();
    ApiResponse.success(socialMedia).send(res);
  } catch (error) {
    next(error);
  }
};

// @desc Get sliders
// @route GET /api/v1/users/sliders
exports.getSliders = async (req, res, next) => {
  const sliderType = req.query.type;

  try {
    let sliders;
    if (sliderType === "all") {
      sliders = await Slider.find({isActive: true}).sort({createdAt: -1})
    } else {
      sliders = await Slider.find({type: sliderType, isActive: true}).sort({createdAt: -1})
    }

    ApiResponse.success(sliders).send(res);
  } catch (error) {
    next(error);
  }
}