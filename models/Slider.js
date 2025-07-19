const mongoose = require("mongoose");

const SliderSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  image: {
    type: String,
    required: true,
  },
  link: {
    type: String,
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  type: {
    type: String,
    enum: ["home", "internet", "combo", "minute", "all"],
    required: true,
  },
}, { timestamps: true });

module.exports = mongoose.model("Slider", SliderSchema);