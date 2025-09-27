const ApiResponse = require("../utils/apiResponse");
const { createTransaction } = require("./walletController");

const Admin = require("../models/Admin");
const Offer = require("../models/Offer");
const Transaction = require("../models/Transaction");
const User = require("../models/User");
const Wallet = require("../models/Wallet");
const PurchaseRequest = require("../models/PurchaseRequest");
const Notification = require("../models/Notification");
const RewardInfo = require("../models/Reward");
const SocialMedia = require("../models/SocialMedia");
const Slider = require("../models/Slider");
const { resetUserPassword } = require("../utils/resetUserPassword");

const fs = require("fs");
const path = require("path");

// @desc    Login admin
// @route   POST /api/v1/admins/login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // 1. Check if admin exists
    const admin = await Admin.findOne({ email }).select("+password");
    if (!admin) {
      return ApiResponse.unauthorized("Invalid credentials").send(res);
    }

    // 2. Verify password
    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return ApiResponse.unauthorized("Invalid credentials").send(res);
    }

    // 3. Generate token
    const token = admin.generateAuthToken();

    // 4. Remove password from output
    admin.password = undefined;

    ApiResponse.success({ token, admin }, "Admin logged in successfully").send(
      res
    );
  } catch (error) {
    next(error);
  }
};

// @desc    Get current admin
// @route   GET /api/v1/admins/me
exports.getMe = async (req, res, next) => {
  try {
    const admin = await Admin.findById(req.admin._id);
    ApiResponse.success(admin).send(res);
  } catch (error) {
    next(error);
  }
};

// @desc    Update admin details
// @route   PATCH /api/v1/admins/update
exports.updateAdmin = async (req, res, next) => {
  try {
    const fieldsToUpdate = {
      name: req.body.name,
      email: req.body.email,
      subscriptionAmount: req.body.subscriptionAmount,
    };

    const admin = await Admin.findByIdAndUpdate(req.admin._id, fieldsToUpdate, {
      new: true,
      runValidators: true,
    });

    ApiResponse.success(admin, "Admin updated successfully").send(res);
  } catch (error) {
    next(error);
  }
};

// @desc    Update admin password
// @route   PATCH /api/v1/admins/update-password
exports.updatePassword = async (req, res, next) => {
  try {
    const admin = await Admin.findById(req.admin._id).select("+password");

    // Check current password
    const isMatch = await admin.comparePassword(req.body.currentPassword);
    if (!isMatch) {
      return ApiResponse.unauthorized("Current password is incorrect").send(
        res
      );
    }

    admin.password = req.body.newPassword;
    await admin.save();

    admin.password = undefined;
    ApiResponse.success(admin, "Password updated successfully").send(res);
  } catch (error) {
    next(error);
  }
};

// @desc    Get dashboard statistics
// @route   GET /api/v1/admins/dashboard
// @access  Admin
exports.getDashboardStats = async (req, res, next) => {
  try {
    // Get counts in parallel for better performance
    const [
      totalUsers,
      totalWallets,
      totalTransactions,
      wallets,
      recentTransactions,
      activeOffers,
    ] = await Promise.all([
      User.countDocuments(),
      Wallet.countDocuments(),
      Transaction.countDocuments(),
      Wallet.find().select("balance"),
      Transaction.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("user", "name phoneNo"),
      Offer.find({ isActive: true, isDeleted: false }).countDocuments(),
    ]);

    // Calculate total balance from all wallets
    const totalBalance = wallets.reduce(
      (sum, wallet) => sum + wallet.balance,
      0
    );

    // Format recent transactions
    const formattedTransactions = recentTransactions.map((txn) => ({
      id: txn._id,
      amount: txn.amount,
      type: txn.type,
      description: txn.description,
      user: txn.user ? `${txn.user.name} (${txn.user.phoneNo})` : "N/A",
      date: txn.createdAt,
    }));

    // Prepare response data
    const data = {
      totalUsers,
      totalWallets,
      totalTransactions,
      totalBalance,
      activeOffers,
      recentTransactions: formattedTransactions,
      stats: {
        usersLast7Days: await getCountLastNDays(User, 7),
        transactionsLast7Days: await getCountLastNDays(Transaction, 7),
        walletGrowthPercentage: await calculateGrowthPercentage(Wallet, 30),
        transactionGrowthPercentage: await calculateGrowthPercentage(
          Transaction,
          30
        ),
      },
    };

    ApiResponse.success(data).send(res);
  } catch (error) {
    next(error);
  }
};

// Helper function to get count of documents created in last N days
async function getCountLastNDays(model, days) {
  const date = new Date();
  date.setDate(date.getDate() - days);

  return model.countDocuments({
    createdAt: { $gte: date },
  });
}

// Helper function to calculate growth percentage
async function calculateGrowthPercentage(model, days) {
  const now = new Date();
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - days);

  const currentPeriodCount = await model.countDocuments({
    createdAt: { $gte: pastDate, $lte: now },
  });

  const previousPeriodCount = await model.countDocuments({
    createdAt: {
      $gte: new Date(pastDate.getTime() - days * 24 * 60 * 60 * 1000),
      $lt: pastDate,
    },
  });

  if (previousPeriodCount === 0) return 100; // Avoid division by zero
  return (
    ((currentPeriodCount - previousPeriodCount) / previousPeriodCount) * 100
  );
}

// @desc    Get all purchase requests
// @route   GET /api/v1/admins/purchase-requests
exports.getPurchaseRequests = async (req, res, next) => {
  try {
    const { status, operator } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    let query = {};
    if (status) query.status = status;
    if (operator) query["offer.operator"] = operator;

    const requests = await PurchaseRequest.find(query)
      .populate("user", "name phoneNo")
      .populate("offer", "title operator offerType price")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await PurchaseRequest.countDocuments(query);

    ApiResponse.success({
      requests,
      total,
      page,
      pages: Math.ceil(total / limit),
    }).send(res);
  } catch (error) {
    next(error);
  }
};

// @desc    Update purchase request status
// @route   PUT /api/v1/admins/purchase-requests/:id
exports.updatePurchaseRequest = async (req, res, next) => {
  try {
    const { status, adminNotes } = req.body;
    const adminId = req.admin._id;

    const request = await PurchaseRequest.findById(req.params.id)
      .populate("transaction")
      .populate("offer");

    if (!request) {
      return ApiResponse.notFound("Request not found").send(res);
    }

    // Validate status transition
    if (request.status === "approved") {
      return ApiResponse.error(
        "Approved requests cannot be modified",
        400
      ).send(res);
    }

    request.status = status;
    request.adminNotes = adminNotes;
    request.processedBy = adminId;
    request.processedAt = new Date();

    // If rejected, refund the amount
    if (status === "rejected") {
      const wallet = await Wallet.findOne({ user: request.user });
      wallet.balance += request.amount;
      await wallet.save();

      // create new transaction as a refund
      await createTransaction(
        request.user,
        wallet._id,
        request.amount,
        "credit",
        `Refund for rejected purchase request ${request._id}`,
        `REF-${request._id}`,
        {
          requestId: request._id,
          offerId: request.offer._id,
        }
      );
    }
    // If approved, mark as completed
    else if (status === "approved") {
      request.transaction.status = "completed";
      await request.transaction.save();

      // // Here you would integrate with telecom API to activate the offer
      // // For now we'll just mark as completed
      request.status = status;
      // request.status = "completed";
    }

    await request.save();

    ApiResponse.success(request, "Request updated successfully").send(res);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get subscription amount for app user
 * @route   GET /api/v1/admins/subscription-amount
 * @access  User
 */
exports.getSubscriptionAmount = async (req, res, next) => {
  try {
    const admin = await Admin.findOne().select("subscriptionAmount");
    if (!admin) {
      return ApiResponse.notFound("Admin not found").send(res);
    }
    ApiResponse.success({ subscriptionAmount: admin.subscriptionAmount }).send(
      res
    );
  } catch (error) {
    next(error);
  }
};

exports.getNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({ isRead: false })
      .sort({ createdAt: -1 })
      .limit(20);

    ApiResponse.success(notifications).send(res);
  } catch (error) {
    next(error);
  }
};

// @desc    Mark notification as read
exports.markNotificationAsRead = async (req, res, next) => {
  try {
    const { notificationId } = req.body;

    const notification = await Notification.findById(notificationId);
    if (!notification) {
      return ApiResponse.notFound("Notification not found").send(res);
    }

    notification.isRead = true;
    await notification.save();

    ApiResponse.success(notification, "Notification marked as read").send(res);
  } catch (error) {
    next(error);
  }
};

// @desc    Get reward info
// @route   GET /api/v1/admins/reward-info
// @access  Admin
exports.getRewardInfo = async (req, res, next) => {
  try {
    const rewardInfo = await RewardInfo.findOne({});
    ApiResponse.success(rewardInfo).send(res);
  } catch (error) {
    next(error);
  }
};

// @desc    Update reward info
// @route   PUT /api/v1/admins/reward-info
// @access  Admin
exports.updateRewardInfo = async (req, res, next) => {
  try {
    const { referalReward, welcomeReward } = req.body;
    const rewardInfo = await RewardInfo.findOneAndUpdate({}, { referalReward, welcomeReward }, { new: true });
    ApiResponse.success(rewardInfo).send(res);
  } catch (error) {
    next(error);
  }
};

exports.createRewardInfo = async (req, res, next) => {
  try {
    const { referalReward, welcomeReward } = req.body;
    const rewardInfo = await RewardInfo.create({ referalReward, welcomeReward });
    ApiResponse.success(rewardInfo).send(res);
  } catch (error) {
    next(error);
  }
};


// @desc    Get social media links
// @route   GET /api/v1/admins/social-media
// @access  Admin
exports.getSocialMedia = async (req, res, next) => {
  try {
    const socialMedia = await SocialMedia.find();
    ApiResponse.success(socialMedia).send(res);
  } catch (error) {
    next(error);
  }
};

// @desc    Get single social media link
// @route   GET /api/v1/admins/social-media/:id
// @access  Admin
exports.getSocialMediaById = async (req, res, next) => {
  try {
    const socialMedia = await SocialMedia.findById(req.params.id);
    if (!socialMedia) {
      return ApiResponse.notFound("Social media link not found").send(res);
    }
    ApiResponse.success(socialMedia).send(res);
  } catch (error) {
    next(error);
  }
};

// Helper to delete social media logo file
const deleteSocialMediaLogo = (logoFilename) => {
  if (logoFilename) {
    const logoPath = path.join(__dirname, "../public/uploads/social-media", logoFilename);
    if (fs.existsSync(logoPath)) {
      fs.unlinkSync(logoPath);
    }
  }
};

// @desc    Create social media link
// @route   POST /api/v1/admins/social-media
// @access  Admin
exports.createSocialMedia = async (req, res, next) => {
  try {
    const { name, url } = req.body;
    if (!name || !url || !req.file) {
      deleteSocialMediaLogo(req.file?.filename);
      return ApiResponse.error("Name and URL are required").send(res);
    }
    
    const newSocialMedia = await SocialMedia.create({ 
      name, 
      url,
      logo: req.file?.filename || null
    });
    
    ApiResponse.success(newSocialMedia).send(res);
  } catch (error) {
    deleteSocialMediaLogo(req.file?.filename);
    ApiResponse.error(error.message).send(res);
    next(error);
  }
};

// @desc    Update social media links
// @route   PUT /api/v1/admins/social-media
// @access  Admin
exports.updateSocialMedia = async (req, res, next) => {
  try {
    const { name, url } = req.body;
    if (!name || !url) {
      deleteSocialMediaLogo(req.file?.filename);
      return ApiResponse.error("Name and URL are required").send(res);
    }
    
    // Find existing social media to check if it has a logo
    const existingSocialMedia = await SocialMedia.findById(req.params.id);
    if (!existingSocialMedia) {
      deleteSocialMediaLogo(req.file?.filename);
      return ApiResponse.notFound("Social media link not found").send(res);
    }
    
    let updateData = { name, url };
    
    // Handle logo update
    if (req.file) {
      // Delete old logo file if it exists
      deleteSocialMediaLogo(existingSocialMedia.logo);
      updateData.logo = req.file.filename;
    }
    
    const updatedSocialMedia = await SocialMedia.findByIdAndUpdate(
      req.params.id, 
      updateData, 
      { new: true }
    );
    
    ApiResponse.success(updatedSocialMedia).send(res);
  } catch (error) {
    deleteSocialMediaLogo(req.file?.filename);
    next(error);
  }
};

// @desc    Delete social media link
// @route   DELETE /api/v1/admins/social-media
// @access  Admin
exports.deleteSocialMedia = async (req, res, next) => {
  try {
    const { id } = req.params;
    const socialMedia = await SocialMedia.findById(id);
    if (!socialMedia) {
      return ApiResponse.notFound("Social media link not found").send(res);
    }
    
    // Delete logo file if it exists
    deleteSocialMediaLogo(socialMedia.logo);
    
    await SocialMedia.findByIdAndDelete(id);
    ApiResponse.success(null, "Social media link deleted successfully").send(res);
  } catch (error) {
    next(error);
  }
};


// @desc    Get sliders
// @route   GET /api/v1/admins/sliders
// @access  Admin
exports.getSliders = async (req, res, next) => {
  try {
    const sliders = await Slider.find();
    ApiResponse.success(sliders).send(res);
  } catch (error) {
    next(error);
  }
};

// @desc Get single slider
// @route GET /api/v1/admins/sliders
// @access Admin
exports.getSliderById = async (req, res, next) => {
  try {
    const slider = await Slider.findById(req.params.id);
    if (!slider) {
      return ApiResponse.notFound("Slider not found").send(res);
    }
    ApiResponse.success(slider).send(res);
  } catch (error) {
    next(error);
  }
}

// Helper to delete slider image file
const deleteSliderImage = (sliderImageName) => {
  if (sliderImageName) {
    const imagePath = path.join(__dirname, "../public/uploads/sliders", sliderImageName);
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }
  }
};

// @desc    Create slider
// @route   POST /api/v1/admins/sliders
// @access  Admin
exports.createSlider = async (req, res, next) => {
  try {
    const { title, description, link, type } = req.body;

    if (!title || !description || !req.file || !link || !type) {
      deleteSliderImage(req.file?.filename);
      return ApiResponse.error("All fields are required").send(res);
    }

    const newSlider = await Slider.create({ title, description, image: req.file?.filename || null, link, type });
    ApiResponse.success(newSlider).send(res);
  } catch (error) {
    deleteSliderImage(req.file?.filename);
    next(error);
  }
};

// @desc Update slider
// @route PUT /api/v1/admins/sliders/:id
// @access Admin
exports.updateSlider = async (req, res, next) => {
  try {
    const { title, description, link, type, isActive } = req.body;
    if (!title || !description || !link || !type || !isActive) {
      return ApiResponse.error("All fields are required").send(res);
    }

    // Find the existing slider
    const slider = await Slider.findById(req.params.id);
    if (!slider) {
      return ApiResponse.error("Slider not found").send(res);
    }

    // If a new image is uploaded, delete the old one and use the new filename
    let image = slider.image;
    if (req.file) {
      deleteSliderImage(slider.image); // delete old image
      image = req.file.filename;
    }

    // Update the slider
    slider.title = title;
    slider.description = description;
    slider.link = link;
    slider.type = type;
    slider.image = image;
    slider.isActive = isActive;
    await slider.save();

    ApiResponse.success(slider).send(res);
  } catch (error) {
    next(error);
  }
};

// @desc Delete slider
// @route DELETE /api/v1/admins/sliders
// @access Admin
exports.deleteSlider = async (req, res, next) => {
  try {
    const slider = await Slider.findByIdAndDelete(req.params.id);
    ApiResponse.success("Slider deleted successfully").send(res);
  } catch (error) {
    next(error);
  }
}


exports.resetUserPassword = async (req, res, next) => {
  try {
    const { phoneNo, newPassword } = req.body;
    const success = await resetUserPassword(phoneNo, newPassword);
    if (!success) {
      return ApiResponse.notFound("User not found").send(res);
    }
    ApiResponse.success(null, "Password reset successfully").send(res);
  } catch (error) {
    next(error);
  }
};
