require("dotenv").config();

module.exports = {
  PORT: process.env.PORT || 5000,
  GRPC_PORT: process.env.GRPC_PORT || 50051,
  MONGO_URL: process.env.MONGO_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "30d",
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:3000",
  RECOVERY_JWT_SECRET: process.env.RECOVERY_JWT_SECRET
};
