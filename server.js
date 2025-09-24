const app = require("./app");
const connectDB = require("./config/db");
const { PORT, GRPC_PORT } = require("./config/config");
const { initializeSocket } = require("./utils/socketConfig");
const Income = require("./models/Income");
const User = require("./models/User");
const { startGrpcServer } = require("./grpcServer");
const { startConsuming, stopConsuming } = require('./services/consumer');
const { closeProducer } = require('./services/producer');

// Connect to database
connectDB();

const server = app.listen(PORT, "0.0.0.0", async() => {
  console.log(`Server running on port ${PORT}`);
  
  // Start RabbitMQ consumer
  try {
    await startConsuming();
    console.log('RabbitMQ consumer started');
  } catch (error) {
    console.error('Failed to start RabbitMQ consumer:', error);
  }
});

// Initialize Socket.IO
const io = initializeSocket(server);
console.log("Socket.IO initialized");

startGrpcServer(GRPC_PORT);

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  console.log(`${signal} received, shutting down gracefully...`);
  
  // Stop RabbitMQ consumer
  await stopConsuming();
  
  // Close RabbitMQ producer
  await closeProducer();
  
  // Close server
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    console.log('Force closing server');
    process.exit(1);
  }, 10000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled promise rejections
process.on("unhandledRejection", (err, promise) => {
  console.log(`Error: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});
