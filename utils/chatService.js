const Message = require("../models/Message");
const User = require("../models/User");
const Admin = require("../models/Admin");

// Store connected users in memory
const connectedUsers = new Map(); // userId -> socketId
const connectedAdmins = new Map(); // adminId -> socketId
const socketToUser = new Map(); // socketId -> { userId, type }
const socketToAdmin = new Map(); // socketId -> { adminId, type }

/**
 * Generate conversation ID between two users
 * @param {string} userId1 - First user ID
 * @param {string} userId2 - Second user ID
 * @returns {string} - Conversation ID
 */
const generateConversationId = (userId1, userId2) => {
  // Sort IDs to ensure consistent conversation ID regardless of sender/receiver
  const sortedIds = [userId1, userId2].sort();
  return `${sortedIds[0]}_${sortedIds[1]}`;
};

/**
 * Get user info by ID and type
 * @param {string} id - User or Admin ID
 * @param {string} type - 'user' or 'admin'
 * @returns {Promise<object>} - User/Admin info
 */
const getUserInfo = async (id, type) => {
  try {
    if (type === "user") {
      const user = await User.findById(id).select("name phoneNo");
      return user ? { id: user._id, name: user.name, phoneNo: user.phoneNo } : null;
    } else {
      const admin = await Admin.findById(id).select("name email");
      return admin ? { id: admin._id, name: admin.name, email: admin.email } : null;
    }
  } catch (error) {
    console.error("Error getting user info:", error);
    return null;
  }
};

/**
 * Handle user joining chat
 * @param {string} socketId - Socket ID
 * @param {string} userId - User ID
 * @param {string} userType - 'user' or 'admin'
 */
const handleUserJoin = (socketId, userId, userType) => {
  if (userType === "user") {
    connectedUsers.set(userId, socketId);
    socketToUser.set(socketId, { userId, type: "user" });
  } else {
    connectedAdmins.set(userId, socketId);
    socketToAdmin.set(socketId, { adminId: userId, type: "admin" });
  }
  
  console.log(`${userType} ${userId} joined chat. Socket: ${socketId}`);
  console.log("Connected users:", connectedUsers.size);
  console.log("Connected admins:", connectedAdmins.size);
};

/**
 * Handle user disconnection
 * @param {string} socketId - Socket ID
 */
const handleUserDisconnect = (socketId) => {
  // Check if it's a user
  const userInfo = socketToUser.get(socketId);
  if (userInfo) {
    connectedUsers.delete(userInfo.userId);
    socketToUser.delete(socketId);
    console.log(`User ${userInfo.userId} disconnected`);
  }

  // Check if it's an admin
  const adminInfo = socketToAdmin.get(socketId);
  if (adminInfo) {
    connectedAdmins.delete(adminInfo.adminId);
    socketToAdmin.delete(socketId);
    console.log(`Admin ${adminInfo.adminId} disconnected`);
  }

  console.log("Connected users:", connectedUsers.size);
  console.log("Connected admins:", connectedAdmins.size);
};

/**
 * Save message to database
 * @param {object} messageData - Message data
 * @returns {Promise<object>} - Saved message
 */
const saveMessage = async (messageData) => {
  try {
    const conversationId = generateConversationId(messageData.senderId, messageData.receiverId);
    
    const message = await Message.create({
      ...messageData,
      conversationId,
      timestamp: new Date(),
    });

    return message;
  } catch (error) {
    console.error("Error saving message:", error);
    throw error;
  }
};

/**
 * Mark message as seen
 * @param {string} messageId - Message ID
 * @param {string} viewerId - ID of user who viewed the message
 * @returns {Promise<object>} - Updated message
 */
const markMessageAsSeen = async (messageId, viewerId) => {
  try {
    const message = await Message.findByIdAndUpdate(
      messageId,
      { status: "seen" },
      { new: true }
    );

    return message;
  } catch (error) {
    console.error("Error marking message as seen:", error);
    throw error;
  }
};

/**
 * Mark all messages in conversation as seen
 * @param {string} conversationId - Conversation ID
 * @param {string} viewerId - ID of user who viewed the messages
 * @returns {Promise<object>} - Update result
 */
const markConversationAsSeen = async (conversationId, viewerId) => {
  try {
    const result = await Message.updateMany(
      { 
        conversationId, 
        receiverId: viewerId, 
        status: "sent" 
      },
      { status: "seen" }
    );

    return result;
  } catch (error) {
    console.error("Error marking conversation as seen:", error);
    throw error;
  }
};

/**
 * Get conversation messages
 * @param {string} conversationId - Conversation ID
 * @param {number} limit - Number of messages to fetch
 * @param {number} skip - Number of messages to skip
 * @returns {Promise<Array>} - Array of messages
 */
const getConversationMessages = async (conversationId, limit = 50, skip = 0) => {
  try {
    const messages = await Message.find({ conversationId })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);

    return messages.reverse(); // Return in chronological order
  } catch (error) {
    console.error("Error getting conversation messages:", error);
    throw error;
  }
};

/**
 * Get user conversations
 * @param {string} userId - User ID
 * @param {string} userType - 'user' or 'admin'
 * @returns {Promise<Array>} - Array of conversations
 */
const getUserConversations = async (userId, userType) => {
  try {
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [
            { senderId: userId },
            { receiverId: userId }
          ]
        }
      },
      {
        $group: {
          _id: "$conversationId",
          lastMessage: { $last: "$$ROOT" },
          messageCount: { $sum: 1 },
          unreadCount: {
            $sum: {
              $cond: [
                { 
                  $and: [
                    { $eq: ["$receiverId", userId] },
                    { $eq: ["$status", "sent"] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $sort: { "lastMessage.timestamp": -1 }
      }
    ]);

    // Get user info for each conversation
    const conversationsWithUserInfo = await Promise.all(
      conversations.map(async (conv) => {
        const otherUserId = conv.lastMessage.senderId === userId 
          ? conv.lastMessage.receiverId 
          : conv.lastMessage.senderId;
        
        const otherUserType = conv.lastMessage.senderId === userId 
          ? conv.lastMessage.receiverType 
          : conv.lastMessage.senderType;

        const userInfo = await getUserInfo(otherUserId, otherUserType);

        return {
          conversationId: conv._id,
          lastMessage: conv.lastMessage,
          messageCount: conv.messageCount,
          unreadCount: conv.unreadCount,
          otherUser: userInfo,
        };
      })
    );

    return conversationsWithUserInfo;
  } catch (error) {
    console.error("Error getting user conversations:", error);
    throw error;
  }
};

/**
 * Check if admin is online
 * @returns {boolean} - True if admin is online
 */
const isAdminOnline = () => {
  return connectedAdmins.size > 0;
};

/**
 * Get online users count
 * @returns {object} - Online users and admins count
 */
const getOnlineUsers = () => {
  return {
    onlineUsers: connectedUsers.size,
    onlineAdmins: connectedAdmins.size,
    totalOnline: connectedUsers.size + connectedAdmins.size,
  };
};

/**
 * Get socket ID for user/admin
 * @param {string} userId - User/Admin ID
 * @param {string} userType - 'user' or 'admin'
 * @returns {string|null} - Socket ID or null
 */
const getSocketId = (userId, userType) => {
  if (userType === "user") {
    return connectedUsers.get(userId) || null;
  } else {
    return connectedAdmins.get(userId) || null;
  }
};

/**
 * Send message to specific user/admin
 * @param {object} io - Socket.IO instance
 * @param {string} userId - User/Admin ID
 * @param {string} userType - 'user' or 'admin'
 * @param {string} event - Event name
 * @param {object} data - Data to send
 */
const sendToUser = (io, userId, userType, event, data) => {
  const socketId = getSocketId(userId, userType);
  if (socketId) {
    io.to(socketId).emit(event, data);
  }
};

/**
 * Broadcast to all online users/admins
 * @param {object} io - Socket.IO instance
 * @param {string} event - Event name
 * @param {object} data - Data to send
 * @param {string} userType - 'user', 'admin', or 'all'
 */
const broadcastToUsers = (io, event, data, userType = "all") => {
  if (userType === "user" || userType === "all") {
    connectedUsers.forEach((socketId) => {
      io.to(socketId).emit(event, data);
    });
  }
  
  if (userType === "admin" || userType === "all") {
    connectedAdmins.forEach((socketId) => {
      io.to(socketId).emit(event, data);
    });
  }
};

module.exports = {
  generateConversationId,
  getUserInfo,
  handleUserJoin,
  handleUserDisconnect,
  saveMessage,
  markMessageAsSeen,
  markConversationAsSeen,
  getConversationMessages,
  getUserConversations,
  isAdminOnline,
  getOnlineUsers,
  getSocketId,
  sendToUser,
  broadcastToUsers,
  connectedUsers,
  connectedAdmins,
}; 