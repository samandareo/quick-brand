const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");
const { protectUser } = require("../middlewares/auth");

router.post("/initiate", protectUser, paymentController.initiatePayment);
router.post("/verify", paymentController.verifyPayment);
router.post("/webhook", paymentController.paymentWebhook);

module.exports = router;
