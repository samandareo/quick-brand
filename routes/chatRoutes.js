const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chatController");
const { protectUser, protectAdmin } = require("../middlewares/auth");

// User and Admin routes
// how can I protect these routes with both user and admin?
router.route("/conversations").get(protectAdmin, chatController.getConversations);
router.route("/unread-count").get(protectUser, chatController.getUnreadCount);
router.route("/unread-count").get(protectAdmin, chatController.getUnreadCount);

// Conversation routes
router
  .route("/conversations/:conversationId/messages")
  .get(protectAdmin, chatController.getConversationMessages);

router
  .route("/conversations/:conversationId/seen")
  .post(protectAdmin, chatController.markConversationAsSeen);

// User info route
router.route("/users/:userId").get(protectAdmin, chatController.getUserInfo);

// Conversation between specific users
router
  .route("/conversation/:userId1/:userId2")
  .get(protectAdmin, chatController.getConversationBetweenUsers);

// Admin only routes
router.route("/stats").get(protectAdmin, chatController.getChatStats);
router.route("/users").get(protectAdmin, chatController.getAllUsers);
router
  .route("/messages/:messageId")
  .delete(protectAdmin, chatController.deleteMessage);

module.exports = router; 