const Message = require("../models/Message");
const User = require("../models/User");
const Admin = require("../models/Admin");
const ApiResponse = require("../utils/apiResponse");
const chatService = require("../utils/chatService");

// @desc    Get user conversations
// @route   GET /api/v1/chat/conversations
// @access  User/Admin
exports.getConversations = async (req, res, next) => {
  try {
    const userId = req.user?._id || req.admin?._id;
    const userType = req.user ? "user" : "admin";

    const conversations = await chatService.getUserConversations(userId, userType);

    ApiResponse.success(conversations).send(res);
  } catch (error) {
    next(error);
  }
};

// @desc    Get conversation messages
// @route   GET /api/v1/chat/conversations/:conversationId/messages
// @access  User/Admin
exports.getConversationMessages = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;

    const messages = await chatService.getConversationMessages(
      conversationId,
      parseInt(limit),
      skip
    );

    const total = await Message.countDocuments({ conversationId });

    const result = {
      messages,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit),
      },
    };

    ApiResponse.success(result).send(res);
  } catch (error) {
    next(error);
  }
};

// @desc    Mark conversation as seen
// @route   POST /api/v1/chat/conversations/:conversationId/seen
// @access  User/Admin
exports.markConversationAsSeen = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user?._id || req.admin?._id;

    const result = await chatService.markConversationAsSeen(conversationId, userId);

    ApiResponse.success(
      { updatedCount: result.modifiedCount },
      "Conversation marked as seen"
    ).send(res);
  } catch (error) {
    next(error);
  }
};

// @desc    Get user info for chat
// @route   GET /api/v1/chat/users/:userId
// @access  User/Admin
exports.getUserInfo = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { type = "user" } = req.query;

    const userInfo = await chatService.getUserInfo(userId, type);

    if (!userInfo) {
      return ApiResponse.notFound("User not found").send(res);
    }

    ApiResponse.success(userInfo).send(res);
  } catch (error) {
    next(error);
  }
};

// @desc    Get unread message count
// @route   GET /api/v1/chat/unread-count
// @access  User/Admin
exports.getUnreadCount = async (req, res, next) => {
  try {
    const userId = req.user?._id || req.admin?._id;

    const unreadCount = await Message.countDocuments({
      receiverId: userId,
      status: "sent",
    });

    ApiResponse.success({ unreadCount }).send(res);
  } catch (error) {
    next(error);
  }
};

// @desc    Get chat statistics (admin only)
// @route   GET /api/v1/chat/stats
// @access  Admin
exports.getChatStats = async (req, res, next) => {
  try {
    const totalMessages = await Message.countDocuments();
    const totalUsers = await User.countDocuments({ isDeleted: false });
    const totalAdmins = await Admin.countDocuments({ isDeleted: false });

    // Get messages by date (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentMessages = await Message.countDocuments({
      createdAt: { $gte: sevenDaysAgo },
    });

    // Get unread messages count
    const unreadMessages = await Message.countDocuments({ status: "sent" });

    const stats = {
      totalMessages,
      totalUsers,
      totalAdmins,
      recentMessages,
      unreadMessages,
      onlineUsers: chatService.connectedUsers.size,
      onlineAdmins: chatService.connectedAdmins.size,
    };

    ApiResponse.success(stats).send(res);
  } catch (error) {
    next(error);
  }
};

// @desc    Get all users for admin chat
// @route   GET /api/v1/chat/users
// @access  Admin
exports.getAllUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const skip = (page - 1) * limit;

    let query = { isDeleted: false };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { phoneNo: { $regex: search, $options: "i" } },
      ];
    }

    const users = await User.find(query)
      .select("name phoneNo isVerified createdAt")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    const result = {
      users,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit),
      },
    };

    ApiResponse.success(result).send(res);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete message (admin only)
// @route   DELETE /api/v1/chat/messages/:messageId
// @access  Admin
exports.deleteMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findByIdAndDelete(messageId);

    if (!message) {
      return ApiResponse.notFound("Message not found").send(res);
    }

    ApiResponse.success(null, "Message deleted successfully").send(res);
  } catch (error) {
    next(error);
  }
};

// @desc    Get conversation between specific users
// @route   GET /api/v1/chat/conversation/:userId1/:userId2
// @access  User/Admin
exports.getConversationBetweenUsers = async (req, res, next) => {
  try {
    const { userId1, userId2 } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;

    const conversationId = chatService.generateConversationId(userId1, userId2);
    const messages = await chatService.getConversationMessages(
      conversationId,
      parseInt(limit),
      skip
    );

    const total = await Message.countDocuments({ conversationId });

    const result = {
      conversationId,
      messages,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit),
      },
    };

    ApiResponse.success(result).send(res);
  } catch (error) {
    next(error);
  }
}; 