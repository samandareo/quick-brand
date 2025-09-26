const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const errorHandler = require("./middlewares/error");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// Serve static files under /api/uploads before other /api routes
app.use("/api/uploads", express.static("public/uploads"));

// send static HTML for frontend
app.get("/api/", (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Verification</title>
      </head>
      <body>
        <h1>Verification is in process.</h1>
        <p>Please wait...</p>
      </body>
    </html>
  `);
});

// Serve test chat client
app.get("/api/test-chat", (req, res) => {
  res.sendFile(__dirname + "/public/test-chat.html");
});

// Routes
app.use("/api/v1/admins", require("./routes/adminRoutes"));
app.use("/api/v1/admins", require("./routes/adminRechargeRoutes"));
app.use("/api/v1/admins", require("./routes/mobileBankingAdminRoutes"));
app.use("/api/v1/admins", require("./routes/adminManualWithdrawalRoutes"));

app.use("/api/v1/users", require("./routes/incomeRoutes"));
app.use("/api/v1/users", require("./routes/mobileBankingUserRoutes"));
app.use("/api/v1/users", require("./routes/userManualWithdrawalRoutes"));
app.use("/api/v1/users", require("./routes/userRoutes"));

app.use("/api/v1/recharge", require("./routes/userRechargeRoutes"));

app.use("/api/v1/wallet", require("./routes/walletRoutes"));
app.use("/api/v1/offers", require("./routes/offerRoutes"));
app.use("/api/v1/payment", require("./routes/paymentRoutes"));
app.use("/api/v1/operators", require("./routes/operatorRoutes"));
app.use("/api/v1/push-notifications", require("./routes/pushNotificationRoutes"));
app.use("/api/v1/chat", require("./routes/chatRoutes"));

app.use("/api/v1/recovery", require("./routes/recoveryRoutes"));
// Error handler
app.use(errorHandler);

module.exports = app;
