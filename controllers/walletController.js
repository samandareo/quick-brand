const Wallet = require("../models/Wallet");
const User = require("../models/User");
const Transaction = require("../models/Transaction");
const ApiResponse = require("../utils/apiResponse");
const Offer = require("../models/Offer");
const PurchaseRequest = require("../models/PurchaseRequest");
const notificationService = require("../utils/notificationService");

// Helper function to create transaction
exports.createTransaction = async (
  userId,
  walletId,
  amount,
  type,
  description,
  reference,
  metadata = {}
) => {
  const transaction = await Transaction.create({
    user: userId,
    wallet: walletId,
    amount,
    type,
    description,
    reference,
    metadata,
    status: "completed",
  });

  // Update wallet's last transaction reference
  await Wallet.findByIdAndUpdate(walletId, {
    lastTransaction: transaction._id,
  });

  return transaction;
};

// @desc    Get user wallet
// @route   GET /api/v1/wallet
exports.getWallet = async (req, res, next) => {
  try {
    const wallet = await Wallet.findOne({ user: req.user._id });
    if (!wallet) {
      return ApiResponse.notFound("Wallet not found").send(res);
    }
    ApiResponse.success(wallet).send(res);
  } catch (error) {
    next(error);
  }
};

// @desc    Add money to wallet
// @route   POST /api/v1/wallet/add
exports.addMoney = async (req, res, next) => {
  try {
    const { amount, reference } = req.body;

    if (amount <= 0) {
      return ApiResponse.error("Amount must be greater than zero", 400).send(
        res
      );
    }

    const wallet = await Wallet.findOne({ user: req.user._id });
    if (!wallet) {
      return ApiResponse.notFound("Wallet not found").send(res);
    }

    // Update wallet balance
    wallet.balance += amount;
    await wallet.save();

    // Create transaction record
    const transaction = await createTransaction(
      req.user._id,
      wallet._id,
      amount,
      "credit",
      "Wallet top-up",
      reference || `TOPUP-${Date.now()}`,
      { source: "manual" }
    );

    ApiResponse.success(
      { balance: wallet.balance, transaction },
      "Money added to wallet successfully"
    ).send(res);
  } catch (error) {
    next(error);
  }
};

// @desc    Transfer money to another user
// @route   POST /api/v1/wallet/transfer
exports.transferMoney = async (req, res, next) => {
  try {
    const { amount, toPhoneNo, reference } = req.body;

    if (amount <= 0) {
      return ApiResponse.error("Amount must be greater than zero", 400).send(
        res
      );
    }

    if (req.user.phoneNo === toPhoneNo) {
      return ApiResponse.error("Cannot transfer to yourself", 400).send(res);
    }

    // Find recipient user
    const recipient = await User.findOne({ phoneNo: toPhoneNo });
    if (!recipient) {
      return ApiResponse.notFound("Recipient not found").send(res);
    }

    // Find sender's wallet
    const senderWallet = await Wallet.findOne({ user: req.user._id });
    if (!senderWallet) {
      return ApiResponse.notFound("Wallet not found").send(res);
    }

    // Check if sender has sufficient balance
    if (senderWallet.balance < amount) {
      return ApiResponse.error("Insufficient balance", 400).send(res);
    }

    // Find or create recipient's wallet
    let recipientWallet = await Wallet.findOne({ user: recipient._id });
    if (!recipientWallet) {
      recipientWallet = await Wallet.create({ user: recipient._id });
    }

    // Perform transfer
    senderWallet.balance -= amount;
    await senderWallet.save();

    recipientWallet.balance += amount;
    await recipientWallet.save();

    // Create transaction records
    const senderTransaction = await createTransaction(
      req.user._id,
      senderWallet._id,
      amount,
      "debit",
      `Transfer to ${recipient.phoneNo}`,
      reference || `TRANSFER-${Date.now()}`,
      { recipient: recipient._id }
    );

    await createTransaction(
      recipient._id,
      recipientWallet._id,
      amount,
      "credit",
      `Transfer from ${req.user.phoneNo}`,
      reference || `TRANSFER-${Date.now()}`,
      { sender: req.user._id }
    );

    ApiResponse.success(
      {
        newBalance: senderWallet.balance,
        transaction: senderTransaction,
      },
      "Money transferred successfully"
    ).send(res);
  } catch (error) {
    next(error);
  }
};

// @desc    Get wallet transactions
// @route   GET /api/v1/wallet/transactions
exports.getTransactions = async (req, res, next) => {
  try {
    const wallet = await Wallet.findOne({ user: req.user._id });
    if (!wallet) {
      return ApiResponse.notFound("Wallet not found").send(res);
    }

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Filtering
    const filter = { wallet: wallet._id };
    if (req.query.type) {
      filter.type = req.query.type;
    }
    if (req.query.startDate) {
      filter.createdAt = { $gte: new Date(req.query.startDate) };
    }
    if (req.query.endDate) {
      filter.createdAt = {
        ...filter.createdAt,
        $lte: new Date(req.query.endDate),
      };
    }

    // Get transactions with pagination
    const [transactions, total] = await Promise.all([
      Transaction.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Transaction.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit);

    ApiResponse.success({
      transactions,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit,
      },
    }).send(res);
  } catch (error) {
    next(error);
  }
};

// @desc    Get all transactions (Admin only)
// @route   GET /api/v1/wallet/transactions/admin
exports.getTransactionsAdmin = async (req, res, next) => {
  try {
    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Filtering
    const filter = {};
    if (req.query.type) {
      filter.type = req.query.type;
    }
    if (req.query.startDate) {
      filter.createdAt = { $gte: new Date(req.query.startDate) };
    }
    if (req.query.endDate) {
      filter.createdAt = {
        ...filter.createdAt,
        $lte: new Date(req.query.endDate),
      };
    }

    // Get transactions with pagination
    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("user", "name phoneNo")
        .populate("wallet", "balance"),
      Transaction.countDocuments(filter),
    ]);

    ApiResponse.success({
      transactions,
      total,
      page,
      pages: Math.ceil(total / limit),
      limit,
    }).send(res);
  } catch (error) {
    next(error);
  }
};

// @desc    Get wallet by user ID (Admin only)
// @route   GET /api/v1/wallet/:userId
exports.getWalletByUserId = async (req, res, next) => {
  try {
    const wallet = await Wallet.findOne({ user: req.params.userId });
    if (!wallet) {
      return ApiResponse.notFound("Wallet not found").send(res);
    }
    ApiResponse.success(wallet).send(res);
  } catch (error) {
    next(error);
  }
};

// @desc    Get transactions by user ID (Admin only)
// @route   GET /api/v1/wallet/:userId/transactions
exports.getTransactionsByUserId = async (req, res, next) => {
  try {
    const wallet = await Wallet.findOne({ user: req.params.userId });
    if (!wallet) {
      return ApiResponse.notFound("Wallet not found").send(res);
    }

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Filtering
    const filter = { wallet: wallet._id };
    if (req.query.type) {
      filter.type = req.query.type;
    }
    if (req.query.startDate) {
      filter.createdAt = { $gte: new Date(req.query.startDate) };
    }
    if (req.query.endDate) {
      filter.createdAt = {
        ...filter.createdAt,
        $lte: new Date(req.query.endDate),
      };
    }

    // Get transactions with pagination
    const [transactions, total] = await Promise.all([
      Transaction.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Transaction.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit);

    ApiResponse.success({
      transactions,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit,
      },
    }).send(res);
  } catch (error) {
    next(error);
  }
};

// @desc    Purchase telecom offer
// @route   POST /api/v1/wallet/purchase-offer
exports.purchaseOffer = async (req, res, next) => {
  try {
    const { offerId, phoneNo, stateDivision } = req.body;
    const userId = req.user._id;

    // 1. Get offer details
    const offer = await Offer.findById(offerId);
    if (!offer || !offer.isActive) {
      return ApiResponse.error("Offer not available", 400).send(res);
    }

    // 2. Get user wallet
    const wallet = await Wallet.findOne({ user: userId });
    if (!wallet) {
      return ApiResponse.error("Wallet not found", 404).send(res);
    }

    // 3. Check balance
    if (wallet.balance < (offer?.actualPrice || offer?.price)) {
      return ApiResponse.error("Insufficient wallet balance", 400).send(res);
    }

    // 4. Create purchase request
    const purchaseRequest = await PurchaseRequest.create({
      user: userId,
      offer: offerId,
      phoneNo,
      amount: offer?.actualPrice || offer?.price,
      stateDivision,
    });

    // 5. Deduct amount from wallet (but keep pending until approved)
    wallet.balance -= offer?.actualPrice || offer?.price;
    await wallet.save();

    // 6. Create transaction record
    const transaction = await Transaction.create({
      user: userId,
      wallet: wallet._id,
      amount: offer?.actualPrice || offer?.price,
      type: "debit",
      status: "pending",
      reference: `PUR-${purchaseRequest._id}`,
      description: `Purchase request for ${offer.title}`,
      metadata: {
        offerId: offer._id,
        purchaseRequestId: purchaseRequest._id,
        operator: offer.operator,
      },
    });

    // 7. Update purchase request with transaction
    purchaseRequest.transaction = transaction._id;
    await purchaseRequest.save();

    await notificationService.notifyAdminsOfPurchase(offer, purchaseRequest);

    ApiResponse.success(
      {
        purchaseRequest,
        newBalance: wallet.balance,
      },
      "Purchase request created successfully"
    ).send(res);
  } catch (error) {
    next(error);
  }
};

// @desc    Get purchase offer details by status (pending approval or non pending approval)
// @route   GET /api/v1/wallet/purchase-offer
exports.getPurchaseOffersByStatus = async (req, res, next) => {
  try {
    const { status } = req.query;
    const userId = req.user._id;

    // Build filter
    const filter = { user: userId, status: { $ne: "pending" } };
    if (status && status == "pending") {
      filter.status = status;
    }

    // Find purchase requests with offer details
    const purchaseRequests = await PurchaseRequest.find(filter)
      .populate("offer")
      .populate("transaction");

    ApiResponse.success(purchaseRequests).send(res);
  } catch (error) {
    next(error);
  }
};
