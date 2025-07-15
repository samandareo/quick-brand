const Offer = require("../models/Offer");
const ApiResponse = require("../utils/apiResponse");

// @desc    Create a new offer
// @route   POST /api/v1/offers
exports.createOffer = async (req, res, next) => {
  try {
    const {
      title,
      description,
      operatorName,
      operator,
      offerType,
      price,
      discountAmount,
      validity,
      actualPrice,
    } = req.body;

    const offer = await Offer.create({
      title,
      description,
      operatorName,
      operator,
      offerType,
      price,
      discountAmount,
      actualPrice,
      validity,
      createdBy: req.admin._id,
    });

    ApiResponse.created(offer, "Offer created successfully").send(res);
  } catch (error) {
    next(error);
  }
};

// @desc    Get all offers
// @route   GET /api/v1/offers
exports.getOffers = async (req, res, next) => {
  try {
    const { operator, offerType, isActive = "true" } = req.query;
    const filter = { isDeleted: false };

    if (operator) filter.operator = operator;
    if (offerType) filter.offerType = offerType;
    if (isActive) filter.isActive = isActive === "true";

    const offers = await Offer.find(filter)
      .populate("operator", "name")
      .sort({ createdAt: -1 });

    ApiResponse.success(offers).send(res);
  } catch (error) {
    next(error);
  }
};

// @desc    Get single offer
// @route   GET /api/v1/offers/:id
exports.getOffer = async (req, res, next) => {
  try {
    const offer = await Offer.findOne({ _id: req.params.id, isDeleted: false })
      .populate("operator", "name")
      .sort({ createdAt: -1 });

    if (!offer) {
      return ApiResponse.notFound("Offer not found").send(res);
    }

    ApiResponse.success(offer).send(res);
  } catch (error) {
    next(error);
  }
};

// @desc    Update offer
// @route   PATCH /api/v1/offers/:id
exports.updateOffer = async (req, res, next) => {
  try {
    const { price, discountAmount, ...updateData } = req.body;

    // Calculate actual price if price or discount is updated
    if (price || discountAmount) {
      const currentOffer = await Offer.findById(req.params.id);
      const newPrice = price || currentOffer.price;
      const newDiscount = discountAmount || currentOffer.discountAmount;
      updateData.actualPrice = newPrice - newDiscount;
    }

    const offer = await Offer.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!offer) {
      return ApiResponse.notFound("Offer not found").send(res);
    }

    ApiResponse.success(offer, "Offer updated successfully").send(res);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete offer
// @route   DELETE /api/v1/offers/:id
exports.deleteOffer = async (req, res, next) => {
  try {
    const offer = await Offer.findByIdAndUpdate(req.params.id, {
      isDeleted: true,
    });

    if (!offer) {
      return ApiResponse.notFound("Offer not found").send(res);
    }

    ApiResponse.success(null, "Offer deleted successfully").send(res);
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle offer status
// @route   PATCH /api/v1/offers/:id/toggle-status
exports.toggleOfferStatus = async (req, res, next) => {
  try {
    const offer = await Offer.findById(req.params.id);

    if (!offer) {
      return ApiResponse.notFound("Offer not found").send(res);
    }

    offer.isActive = !offer.isActive;
    await offer.save();

    ApiResponse.success(offer, "Offer status updated successfully").send(res);
  } catch (error) {
    next(error);
  }
};
