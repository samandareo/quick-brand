const app = require("./app");
const connectDB = require("./config/db");
const { PORT, GRPC_PORT } = require("./config/config");
const { initializeSocket } = require("./utils/socketConfig");
const Income = require("./models/Income");
const User = require("./models/User");

// Connect to database
connectDB();

const server = app.listen(PORT, "0.0.0.0", async() => {
  console.log(`Server running on port ${PORT}`);

  // const users = await User.find();

  // await Promise.all(users.map(user => {
  //   console.log(`Creating income record for user: ${user._id}`);
  //   return Income.create({user: user._id});
  // }));
});

// Initialize Socket.IO
const io = initializeSocket(server);
console.log("Socket.IO initialized");

startGrpcServer(GRPC_PORT);

// Handle unhandled promise rejections
process.on("unhandledRejection", (err, promise) => {
  console.log(`Error: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});
