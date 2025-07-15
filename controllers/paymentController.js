const axios = require("axios");
const User = require("../models/User");
const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");
const ApiResponse = require("../utils/apiResponse");
const { sendToUser } = require("../utils/notificationService");

// Payment types
const PAYMENT_TYPES = {
  SUBSCRIPTION: "subscription",
  TOPUP: "topup",
};

// @desc    Initiate payment (subscription or topup)
// @route   POST /api/v1/payment/initiate
// @access  Private
exports.initiatePayment = async (req, res, next) => {
  try {
    const { amount, type } = req.body;
    const user = req.user;

    if (!user) {
      return ApiResponse.notFound("User not found").send(res);
    }

    // Validate payment type
    if (!Object.values(PAYMENT_TYPES).includes(type)) {
      return ApiResponse.badRequest("Invalid payment type").send(res);
    }

    // For subscription, use fixed amount
    const paymentAmount = amount;

    // Prepare metadata
    const metadata = {
      userId: user._id.toString(),
      type,
      walletId: user.wallet ? user.wallet.toString() : null,
    };

    console.log(
      {
        full_name: user.name,
        email: user.email,
        amount: paymentAmount.toString(),
        metadata,
        // redirect_url: `${process.env.UDDOKTAPAY_REDIRECT_URL}`,
        // cancel_url: `${process.env.UDDOKTAPAY_CANCEL_URL}`,
        redirect_url: `http://31.220.51.218:3001`,
        cancel_url: `http://31.220.51.218:3001`,
        return_type: "GET",
        webhook_url: `${process.env.BACKEND_URL}v1/payment/webhook`,
      },
      {
        headers: {
          accept: "application/json",
          "RT-UDDOKTAPAY-API-KEY": process.env.UDDOKTAPAY_API_KEY,
          "content-type": "application/json",
        },
      }
    );

    // UddoktaPay API request
    const response = await axios.post(
      `${process.env.UDDOKTAPAY_API_URL}/api/checkout-v2`,
      {
        full_name: user.name,
        email: user.email,
        amount: paymentAmount.toString(),
        metadata,
        // redirect_url: `${process.env.UDDOKTAPAY_REDIRECT_URL}`,
        // cancel_url: `${process.env.UDDOKTAPAY_CANCEL_URL}`,
        redirect_url: `http://31.220.51.218:3001`,
        cancel_url: `http://31.220.51.218:3001`,
        return_type: "GET",
        webhook_url: `http://31.220.51.218/api/v1/payment/webhook`,
        // webhook_url: `https://webhook.site/f9478302-e8aa-4cc8-bc37-6a8aca76c20a`,
      },
      {
        headers: {
          accept: "application/json",
          "RT-UDDOKTAPAY-API-KEY": process.env.UDDOKTAPAY_API_KEY,
          "content-type": "application/json",
        },
      }
    );

    if (response.data.status !== true) {
      ApiResponse.error(
        response.data.message || "Payment initiation failed"
      ).send(res);
      return;
    }

    ApiResponse.success({
      paymentUrl: response.data.payment_url,
    }).send(res);
  } catch (error) {
    console.log(error);

    next(error);
  }
};

// @desc    Verify payment
// @route   POST /api/v1/payment/verify
exports.verifyPayment = async (req, res, next) => {
  try {
    const { invoice_id } = req.body;

    if (!invoice_id) {
      ApiResponse.error("Invoice id is required").send(res);
      return;
    }

    // Verify payment with UddoktaPay
    const response = await axios.post(
      `${process.env.UDDOKTAPAY_API_URL}/api/verify-payment`,
      { invoice_id },
      {
        headers: {
          "RT-UDDOKTAPAY-API-KEY": process.env.UDDOKTAPAY_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    const paymentData = response.data;

    const alreadyCompleted = await Transaction.findOne({
      "metadata.paymentId": invoice_id,
      status: "completed",
    });

    if (alreadyCompleted == null && paymentData.status === "COMPLETED") {
      await processSuccessfulPayment(paymentData);
    }

    ApiResponse.success(paymentData).send(res);
  } catch (error) {
    next(error);
  }
};

// @desc    Webhook handler
// @route   POST /api/v1/payment/webhook
// @access  Public
exports.paymentWebhook = async (req, res, next) => {
  try {
    const headerApi = req.headers["rt-uddoktapay-api-key"];

    // Verify the API key
    if (headerApi !== process.env.UDDOKTAPAY_API_KEY) {
      res.status(401).send("Unauthorized Action");
      return;
    }

    const paymentData = req.body;

    console.log(paymentData);

    const alreadyCompleted = await Transaction.findOne({
      "metadata.paymentId": paymentData.invoice_id,
      status: "completed",
    });

    if (alreadyCompleted == null && paymentData?.status === "COMPLETED") {
      await processSuccessfulPayment(paymentData);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};

// Helper function to process successful payments
async function processSuccessfulPayment(paymentData) {
  const { metadata, amount, invoice_id, transaction_id, ...rest } = paymentData;
  const amountNumber = parseFloat(amount);

  // Process subscription payment
  if (metadata.type === PAYMENT_TYPES.SUBSCRIPTION) {
    const user = await User.findByIdAndUpdate(metadata.userId, {
      isVerified: true,
      subscriptionDate: new Date(),
      subscriptionTransactionId: transaction_id,
    });

    await Transaction.create({
      user: metadata.userId,
      wallet: user?.wallet,
      amount: amountNumber,
      type: "credit",
      description: "Subscription payment",
      reference: `SUB-${transaction_id}`,
      status: "completed",
      metadata: {
        ...rest,
        paymentGateway: "uddoktaPay",
        paymentId: invoice_id,
        transactionId: transaction_id,
      },
    });
  }

  // Process wallet topup
  if (metadata.type === PAYMENT_TYPES.TOPUP) {
    const wallet = await Wallet.findOneAndUpdate(
      { _id: metadata.walletId, user: metadata.userId },
      { $inc: { balance: amountNumber } },
      { new: true }
    );

    if (wallet) {
      await Transaction.create({
        user: metadata.userId,
        wallet: wallet._id,
        amount: amountNumber,
        type: "credit",
        description: "Wallet top-up",
        reference: `TOPUP-${transaction_id}`,
        status: "completed",
        metadata: {
          ...rest,
          paymentGateway: "uddoktaPay",
          paymentId: invoice_id,
          transactionId: transaction_id,
        },
      });
    }
  }

  await sendToUser(metadata.userId, {
    title: "Payment Successful",
    body: `Your payment of ${amount} has been successfully processed.`,
    data: {
      type: metadata.type,
      amount: amountNumber.toString(),
    },
  });
}
