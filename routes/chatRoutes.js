const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chatController");
const { protectUser, protectAdmin, protectUserOrAdmin } = require("../middlewares/auth");

// User and Admin routes
router.route("/conversations").get(protectUserOrAdmin, chatController.getConversations);
router.route("/unread-count").get(protectUserOrAdmin, chatController.getUnreadCount);

// Conversation routes
router
  .route("/conversations/:conversationId/messages")
  .get(protectAdmin, chatController.getConversationMessages);

router
  .route("/conversations/:conversationId/seen")
  .post(protectUserOrAdmin, chatController.markConversationAsSeen);

// User info route
router.route("/users/:userId").get(protectUserOrAdmin, chatController.getUserInfo);

// Conversation between specific users
router
  .route("/conversation/:userId1/:userId2")
  .get(protectUserOrAdmin, chatController.getConversationBetweenUsers);

// Admin only routes
router.route("/stats").get(protectAdmin, chatController.getChatStats);
router.route("/users").get(protectAdmin, chatController.getAllUsers);
router
  .route("/messages/:messageId")
  .delete(protectAdmin, chatController.deleteMessage);

module.exports = router; 