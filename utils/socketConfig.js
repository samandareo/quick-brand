const socketIO = require("socket.io");
const jwt = require("jsonwebtoken");
const chatService = require("./chatService");

let io;

/**
 * Initialize Socket.IO
 * @param {object} server - HTTP server instance
 * @returns {object} - .IO instance
 */
const initializeSocket = (server) => {
  io = socketIO(server, {
    cors: {
      origin: "*", // Configure this based on your frontend URL
      methods: ["GET", "POST"],
    },
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization;
      
      if (!token) {
        return next(new Error("Authentication error: Token required"));
      }

      // Remove 'Bearer ' prefix if present
      const cleanToken = token.replace("Bearer ", "");
      
      const decoded = jwt.verify(cleanToken, process.env.JWT_SECRET);
      console.log(decoded);
      socket.userId = decoded.id;
      socket.userType = decoded.type === "superadmin" || decoded.type === "admin" ? "admin" : "user"; // Default to user if not specified
      
      next();
    } catch (error) {
      console.error("Socket authentication error:", error);
      next(new Error("Authentication error: Invalid token"));
    }
  });

  // Connection handler
  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.userId} (${socket.userType})`);
    
    // Handle user joining
    chatService.handleUserJoin(socket.id, socket.userId, socket.userType);

    // Join user to their personal room
    socket.join(socket.userId);

    // Emit user joined event
    socket.emit("user_joined", {
      userId: socket.userId,
      userType: socket.userType,
      message: "Successfully connected to chat",
    });

    // Broadcast online status to others
    socket.broadcast.emit("user_online", {
      userId: socket.userId,
      userType: socket.userType,
    });

    // Handle join event (for backward compatibility)
    socket.on("join", (data) => {
      console.log(`User ${socket.userId} joined with data:`, data);
    });

    // Handle sending messages
    socket.on("send_message", async (data) => {
      try {
        const { receiverId, message, receiverType = "admin" } = data;
        
        if (!receiverId || !message) {
          socket.emit("error", { message: "Receiver ID and message are required" });
          return;
        }

        // Save message to database
        const savedMessage = await chatService.saveMessage({
          senderId: socket.userId,
          receiverId,
          message,
          senderType: socket.userType,
          receiverType,
        });

        // Prepare message data for emission
        const messageData = {
          _id: savedMessage._id,
          senderId: savedMessage.senderId,
          receiverId: savedMessage.receiverId,
          message: savedMessage.message,
          timestamp: savedMessage.timestamp,
          status: savedMessage.status,
          conversationId: savedMessage.conversationId,
          senderType: savedMessage.senderType,
          receiverType: savedMessage.receiverType,
        };

        // Emit to sender (confirmation)
        socket.emit("message_sent", messageData);

        // Emit to receiver if online
        const receiverSocketId = chatService.getSocketId(receiverId, receiverType);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("new_message", messageData);
        }

        console.log(`Message sent from ${socket.userId} to ${receiverId}`);
      } catch (error) {
        console.error("Error sending message:", error);
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    // Handle message seen
    socket.on("message_seen", async (data) => {
      try {
        const { messageId, conversationId } = data;
        
        if (messageId) {
          // Mark specific message as seen
          const updatedMessage = await chatService.markMessageAsSeen(messageId, socket.userId);
          
          // Notify original sender
          const senderSocketId = chatService.getSocketId(updatedMessage.senderId, updatedMessage.senderType);
          if (senderSocketId) {
            io.to(senderSocketId).emit("message_seen", {
              messageId: updatedMessage._id,
              seenBy: socket.userId,
              seenAt: updatedMessage.updatedAt,
            });
          }
        } else if (conversationId) {
          // Mark all messages in conversation as seen
          const result = await chatService.markConversationAsSeen(conversationId, socket.userId);
          
          // Get all messages that were marked as seen
          const messages = await chatService.getConversationMessages(conversationId);
          const seenMessages = messages.filter(msg => 
            msg.receiverId === socket.userId && msg.status === "seen"
          );
          
          // Notify original senders
          seenMessages.forEach(msg => {
            const senderSocketId = chatService.getSocketId(msg.senderId, msg.senderType);
            if (senderSocketId) {
              io.to(senderSocketId).emit("message_seen", {
                messageId: msg._id,
                seenBy: socket.userId,
                seenAt: new Date(),
              });
            }
          });
        }
      } catch (error) {
        console.error("Error marking message as seen:", error);
        socket.emit("error", { message: "Failed to mark message as seen" });
      }
    });

    // Handle typing indicator
    socket.on("typing_start", (data) => {
      const { receiverId, receiverType = "admin" } = data;
      const receiverSocketId = chatService.getSocketId(receiverId, receiverType);
      
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("user_typing", {
          userId: socket.userId,
          userType: socket.userType,
          isTyping: true,
        });
      }
    });

    socket.on("typing_stop", (data) => {
      const { receiverId, receiverType = "admin" } = data;
      const receiverSocketId = chatService.getSocketId(receiverId, receiverType);
      
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("user_typing", {
          userId: socket.userId,
          userType: socket.userType,
          isTyping: false,
        });
      }
    });

    // Handle admin online check
    socket.on("check_admin_online", () => {
      const isOnline = chatService.isAdminOnline();
      socket.emit("admin_online_status", { isOnline });
    });

    // Handle get online users (admin only)
    socket.on("get_online_users", () => {
      if (socket.userType === "admin") {
        const onlineStats = chatService.getOnlineUsers();
        socket.emit("online_users", onlineStats);
      } else {
        socket.emit("error", { message: "Unauthorized" });
      }
    });

    // Handle get conversations
    socket.on("get_conversations", async () => {
      try {
        const conversations = await chatService.getUserConversations(socket.userId, socket.userType);
        socket.emit("conversations", conversations);
      } catch (error) {
        console.error("Error getting conversations:", error);
        socket.emit("error", { message: "Failed to get conversations" });
      }
    });

    // Handle get conversation messages
    socket.on("get_conversation_messages", async (data) => {
      try {
        const { conversationId, limit = 50, skip = 0 } = data;
        const messages = await chatService.getConversationMessages(conversationId, limit, skip);
        socket.emit("conversation_messages", {
          conversationId,
          messages,
        });
      } catch (error) {
        console.error("Error getting conversation messages:", error);
        socket.emit("error", { message: "Failed to get conversation messages" });
      }
    });

    // Handle disconnect
    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.userId} (${socket.userType})`);
      
      // Handle user disconnection
      chatService.handleUserDisconnect(socket.id);
      
      // Broadcast offline status
      socket.broadcast.emit("user_offline", {
        userId: socket.userId,
        userType: socket.userType,
      });
    });
  });

  return io;
};

/**
 * Get Socket.IO instance
 * @returns {object} - Socket.IO instance
 */
const getIO = () => {
  if (!io) {
    throw new Error("Socket.IO not initialized. Call initializeSocket first.");
  }
  return io;
};

module.exports = {
  initializeSocket,
  getIO,
}; 