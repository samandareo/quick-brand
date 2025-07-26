class ApiResponse {
  constructor(data = null, message = null, statusCode = 200) {
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
    this.success = statusCode < 400;
  }

  static success(data, message = "Success", statusCode = 200) {
    return new ApiResponse(data, message, statusCode);
  }

  static created(data, message = "Created successfully") {
    return new ApiResponse(data, message, 201);
  }

  static unauthorized(message = "Unauthorized") {
    return new ApiResponse(null, message, 401);
  }

  static forbidden(message = "Forbidden") {
    return new ApiResponse(null, message, 403);
  }

  static notFound(message = "Not found") {
    return new ApiResponse(null, message, 404);
  }

  static error(message = "Internal server error", statusCode = 500) {
    return new ApiResponse(null, message, statusCode);
  }

  static invalid(message = "Invalid value") {
    return new ApiResponse(null, message, 400)
  }

  send(res) {
    return res.status(this.statusCode).json({
      success: this.success,
      message: this.message,
      data: this.data,
    });
  }
}

module.exports = ApiResponse;
