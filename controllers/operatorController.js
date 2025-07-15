const Operator = require("../models/Operator");
const ApiResponse = require("../utils/apiResponse");
const upload = require("../utils/multerConfig");
const fs = require("fs");
const path = require("path");

// Helper to delete image file
const deleteImageFile = (imagePath) => {
  if (imagePath) {
    const fullPath = path.join(__dirname, "../public/uploads", imagePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  }
};

// @desc    Create new operator
// @route   POST /api/v1/operators
exports.createOperator = async (req, res, next) => {
  try {
    const { name } = req.body;

    // Check if operator already exists
    const existingOperator = await Operator.findOne({ name, isDeleted: false });
    if (existingOperator) {
      deleteImageFile(req.file?.filename);
      return ApiResponse.error(
        "Operator with this name already exists",
        400
      ).send(res);
    }

    const operator = await Operator.create({
      ...req.body,
      name,
      image: req.file?.filename,
    });

    ApiResponse.created(operator, "Operator created successfully").send(res);
  } catch (error) {
    deleteImageFile(req.file?.filename);
    next(error);
  }
};

// @desc    Get all operators
// @route   GET /api/v1/operators
exports.getOperators = async (req, res, next) => {
  try {
    const { isActive, search } = req.query;
    let query = { isDeleted: false };

    if (isActive) {
      query.isActive = isActive === "true";
    }

    if (search) {
      const regex = new RegExp(search, "i"); // Case-insensitive search
      query.name = { $regex: regex };
    }

    const operators = await Operator.find(query).sort({ name: 1 });
    ApiResponse.success(operators).send(res);
  } catch (error) {
    next(error);
  }
};

// @desc    Get single operator
// @route   GET /api/v1/operators/:id
exports.getOperator = async (req, res, next) => {
  try {
    const operator = await Operator.findById(req.params.id);
    if (!operator) {
      return ApiResponse.notFound("Operator not found").send(res);
    }
    ApiResponse.success(operator).send(res);
  } catch (error) {
    next(error);
  }
};

// @desc    Update operator
// @route   PUT /api/v1/operators/:id
exports.updateOperator = async (req, res, next) => {
  try {
    const { name, themeColor } = req.body;
    let updateData = { name, themeColor };

    // Find existing operator
    const operator = await Operator.findById(req.params.id);
    if (!operator) {
      deleteImageFile(req.file?.filename);
      return ApiResponse.notFound("Operator not found").send(res);
    }

    // Check for duplicate name
    if (name && name !== operator.name) {
      const existingOperator = await Operator.findOne({ name });
      if (existingOperator) {
        deleteImageFile(req.file?.filename);
        return ApiResponse.error(
          "Operator with this name already exists",
          400
        ).send(res);
      }
    }

    // Handle image update
    if (req.file) {
      // Delete old image
      deleteImageFile(operator.image);
      updateData.image = req.file.filename;
    }

    const updatedOperator = await Operator.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    ApiResponse.success(updatedOperator, "Operator updated successfully").send(
      res
    );
  } catch (error) {
    deleteImageFile(req.file?.filename);
    next(error);
  }
};

// @desc    Toggle operator status
// @route   PATCH /api/v1/operators/:id/toggle-status
exports.toggleOperatorStatus = async (req, res, next) => {
  try {
    const operator = await Operator.findById(req.params.id);
    if (!operator) {
      return ApiResponse.notFound("Operator not found").send(res);
    }

    operator.isActive = !operator.isActive;
    await operator.save();

    ApiResponse.success(
      operator,
      `Operator ${operator.isActive ? "activated" : "deactivated"} successfully`
    ).send(res);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete operator (soft delete)
// @route   DELETE /api/v1/operators/:id
exports.deleteOperator = async (req, res, next) => {
  try {
    const operator = await Operator.findById(req.params.id);
    if (!operator) {
      return ApiResponse.notFound("Operator not found").send(res);
    }

    await operator.softDelete();
    ApiResponse.success(null, "Operator deleted successfully").send(res);
  } catch (error) {
    next(error);
  }
};
