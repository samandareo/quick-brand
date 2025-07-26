const MobileBanking = require("../models/MobileBanking");
const ApiResponse = require("../utils/apiResponse");

// @desc Admin create new mobile banking
// @route POST /api/v1/admins/mobile-banking
// @access Admin
exports.createMobileBanking = async (req, res, next) => {
  try {
    const { name, isActive } = req.body;
    let logo;
    if (req.file) {
      logo = req.file.filename;
    }
    const mobileBanking = await MobileBanking.create({
      name,
      logo,
      isActive
    });
    ApiResponse.created(mobileBanking, "MobileBanking created successfully").send(res);
  } catch (error) {
    next(error);
  }
};

// @desc Admin get mobile bankings
// @route GET /api/v1/admins/mobile-banking
// @access Admin
exports.getMobileBankings = async (req, res, next) => {
  try {
    const mobileBankings = await MobileBanking.find();
    ApiResponse.success(mobileBankings).send(res);
  } catch (error) {
    next(error);
  }
};

// @desc Admin get mobile banking by ID
// @route GET /api/v1/admins/mobile-banking/:id
// @access Admin
exports.getMobileBankingById = async (req, res, next) => {
  try {
    const mobileBanking = await MobileBanking.findById(req.params.id);
    if (!mobileBanking) {
      return ApiResponse.notFound("MobileBanking not found").send(res);
    }
    ApiResponse.success(mobileBanking).send(res);
  } catch (error) {
    next(error);
  }
};

// @desc Admin update mobile banking by ID
// @route PUT /api/v1/admins/mobile-banking/:id
// @access Admin

exports.updateMobileBanking = async (req, res, next) => {
  try {
    let data = req.body;
    if (req.file) {
      data.logo = req.file.filename;
    }
    const mobileBanking = await MobileBanking.findByIdAndUpdate(
      req.params.id,
      data,
      { new: true, runValidators: true }
    );
    if (!mobileBanking) {
      return ApiResponse.notFound("MobileBanking not found").send(res);
    }
    ApiResponse.success(mobileBanking, "MobileBanking updated successfully").send(res);
  } catch (error) {
    next(error);
  }
};

// @desc Admin delete mobile banking
// @route DELETE /api/v1/admins/mobile-banking/:id
// @access Admin
exports.deleteMobileBanking = async (req, res, next) => {
  try {
    const mobileBanking = await MobileBanking.findByIdAndDelete(req.params.id);
    if (!mobileBanking) {
      return ApiResponse.notFound("MobileBanking not found").send(res);
    }
    ApiResponse.success(null, "MobileBanking deleted successfully").send(res);
  } catch (error) {
    next(error);
  }
};

