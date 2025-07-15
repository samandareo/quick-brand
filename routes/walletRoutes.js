const express = require("express");
const router = express.Router();
const walletController = require("../controllers/walletController");
const { protectAdmin, protectUser } = require("../middlewares/auth");

// Wallet routes
router.route("/").get(protectUser, walletController.getWallet);
router.route("/add").post(protectUser, walletController.addMoney);
router.route("/transfer").post(protectUser, walletController.transferMoney);
router
  .route("/transactions")
  .get(protectUser, walletController.getTransactions);

router
  .route("/purchase-offer")
  .get(protectUser, walletController.getPurchaseOffersByStatus)
  .post(protectUser, walletController.purchaseOffer);

// Admin routes for wallet management
router.use(protectAdmin);
router.route("/transactions/admin").get(walletController.getTransactionsAdmin);
router.route("/:userId").get(walletController.getWalletByUserId);
router
  .route("/:userId/transactions")
  .get(walletController.getTransactionsByUserId);

module.exports = router;
