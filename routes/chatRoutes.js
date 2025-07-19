const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chatController");
const { protectUser, protectAdmin } = require("../middlewares/auth");

// User and Admin routes
router.route("/conversations").get(protectUser, chatController.getConversations);
router.route("/unread-count").get(protectUser, chatController.getUnreadCount);

// Conversation routes
router
  .route("/conversations/:conversationId/messages")
  .get(protectUser, chatController.getConversationMessages);

router
  .route("/conversations/:conversationId/seen")
  .post(protectUser, chatController.markConversationAsSeen);

// User info route
router.route("/users/:userId").get(protectUser, chatController.getUserInfo);

// Conversation between specific users
router
  .route("/conversation/:userId1/:userId2")
  .get(protectUser, chatController.getConversationBetweenUsers);

// Admin only routes
router.route("/stats").get(protectAdmin, chatController.getChatStats);
router.route("/users").get(protectAdmin, chatController.getAllUsers);
router
  .route("/messages/:messageId")
  .delete(protectAdmin, chatController.deleteMessage);

module.exports = router; 