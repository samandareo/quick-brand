const jwt = require("jsonwebtoken");
const ApiResponse = require("../utils/apiResponse");
const Admin = require("../models/Admin");
const User = require("../models/User");
const Recovery = require("../models/Recovery");

// Protect admin routes
exports.protectAdmin = async (req, res, next) => {
  try {
    let token;

    if (req?.headers?.authorization) {
      if (req.headers.authorization.startsWith("Bearer"))
        token = req.headers.authorization.split(" ")[1];
      else token = req.headers.authorization;
    }

    if (!token) {
      return ApiResponse.unauthorized(
        "Not authorized to access this route without a token"
      ).send(res);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const admin = await Admin.findOne({ _id: decoded.id, isDeleted: false });

    if (!admin) {
      return ApiResponse.unauthorized(
        "Not authorized to access this route without a valid admin"
      ).send(res);
    }

    req.admin = admin;
    next();
  } catch (err) {
    return ApiResponse.unauthorized("Not authorized to access this route").send(
      res
    );
  }
};

// Protect user routes
exports.protectUser = async (req, res, next) => {
  try {
    let token;

    if (req?.headers?.authorization) {
      if (req.headers.authorization.startsWith("Bearer"))
        token = req.headers.authorization.split(" ")[1];
      else token = req.headers.authorization;
    }

    if (!token) {
      return ApiResponse.unauthorized(
        "Not authorized to access this route without a token"
      ).send(res);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.recovery === true) {
      return ApiResponse.badRequest(
        "Recovery token cannot be used to access this route"
      ).send(res);
    }

    const user = await User.findOne({ _id: decoded.id, isDeleted: false });

    if (!user)
      return ApiResponse.unauthorized(
        "Not authorized to access this route without a valid user"
      ).send(res);

    if (!user.isVerified && !(req.body?.type === "subscription"))
      return ApiResponse.unauthorized(
        "User is not verified to access this route without a subscription"
      ).send(res);

    req.user = user;
    next();
  } catch (err) {
    return ApiResponse.unauthorized(`Not authorized to access this route ${err.message}`).send(
      res
    );
  }
};

// Protect routes for both admin and user
exports.protectUserOrAdmin = async (req, res, next) => {
  try {
    let token;

    if (req?.headers?.authorization) {
      if (req.headers.authorization.startsWith("Bearer"))
        token = req.headers.authorization.split(" ")[1];
      else token = req.headers.authorization;
    }

    if (!token) {
      return ApiResponse.unauthorized(
        "Not authorized to access this route without a token"
      ).send(res);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Try to find admin first
    const admin = await Admin.findOne({ _id: decoded.id, isDeleted: false });
    
    if (admin) {
      req.admin = admin;
      req.userType = 'admin';
      return next();
    }

    // If not admin, try to find user
    const user = await User.findOne({ _id: decoded.id, isDeleted: false });
    
    if (!user) {
      return ApiResponse.unauthorized(
        "Not authorized to access this route - invalid credentials"
      ).send(res);
    }

    if (!user.isVerified && !(req.body?.type === "subscription")) {
      return ApiResponse.unauthorized(
        "User is not verified to access this route without a subscription"
      ).send(res);
    }

    req.user = user;
    req.userType = 'user';
    next();

  } catch (err) {
    return ApiResponse.unauthorized(
      `Not authorized to access this route: ${err.message}`
    ).send(res);
  }
};

exports.protectRecovery = async (req, res, next) => {
  try {
    let token;
    
    if (req?.headers?.authorization) {
      if (req.headers.authorization.startsWith("Bearer"))
        token = req.headers.authorization.split(" ")[1];
      else token = req.headers.authorization;
    }

    if (!token) {
      return ApiResponse.unauthorized(
        "Not authorized to access this route without a token"
      ).send(res);
    }
    
    const decoded = jwt.verify(token, process.env.RECOVERY_JWT_SECRET, { maxAge: '15m' });
    const recoveryRecord = await Recovery.findOne({ _id: decoded.id });

    if (!recoveryRecord) {
      return ApiResponse.unauthorized(
        "Not authorized to access this route - invalid recovery record"
      ).send(res);
    }

    req.recoveryRecord = recoveryRecord;

    const user = await User.findOne({ phoneNo: recoveryRecord.phoneNumber, isDeleted: false });

    if (!user) {
      return ApiResponse.unauthorized(
        "Not authorized to access this route - associated user not found"
      ).send(res);
    }

    req.user = user;
    next();
  } catch (err) {
    return ApiResponse.unauthorized(
      `Not authorized to access this route: ${err.message}`
    ).send(res);
  }
};