const jwt = require("jsonwebtoken");
const ApiResponse = require("../utils/apiResponse");
const Admin = require("../models/Admin");
const User = require("../models/User");

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
