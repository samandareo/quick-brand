const ApiResponse = require("../utils/apiResponse");

module.exports = (err, req, res, next) => {
  console.error(err.stack);

  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((val) => val.message);
    return ApiResponse.error(messages.join(", "), 400).send(res);
  }

  if (err.name === "MongoError" && err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return ApiResponse.error(`${field} already exists`, 400).send(res);
  }

  if (err.name === "CastError") {
    return ApiResponse.error("Resource not found", 404).send(res);
  }

  // Default to 500 server error
  ApiResponse.error().send(res);
};
