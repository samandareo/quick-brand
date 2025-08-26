require("dotenv").config();

module.exports = {
  PORT: process.env.PORT || 5000,
  MONGO_URL: process.env.MONGO_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "30d",
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:3000",
};
