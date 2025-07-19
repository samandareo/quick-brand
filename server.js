const app = require("./app");
const connectDB = require("./config/db");
const { PORT } = require("./config/config");
const { initializeSocket } = require("./utils/socketConfig");

// Connect to database
connectDB();

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});

// Initialize Socket.IO
const io = initializeSocket(server);
console.log("Socket.IO initialized");

// Handle unhandled promise rejections
process.on("unhandledRejection", (err, promise) => {
  console.log(`Error: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});
