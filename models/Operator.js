const mongoose = require("mongoose");

const operatorSchema = new mongoose.Schema(
  {
    operatorId: {
      type: Number,
      unique: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    image: {
      type: String,
      required: true,
    },
    themeColor: {
      type: String,
      default: "#000000",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Auto-increment operatorId
// Pre-save hook to set operatorId
operatorSchema.pre("save", async function (next) {
  if (this.isNew && !this.operatorId) {
    try {
      const lastRecord = await mongoose
        .model("Operator")
        .findOne({})
        .sort({ operatorId: -1 })
        .select("operatorId")
        .lean();

      this.operatorId = lastRecord ? lastRecord.operatorId + 1 : 1;
      next();
    } catch (err) {
      next(err);
    }
  } else {
    next();
  }
});
// Soft delete method
operatorSchema.methods.softDelete = function () {
  this.isDeleted = true;
  return this.save();
};


module.exports = mongoose.model("Operator", operatorSchema);
