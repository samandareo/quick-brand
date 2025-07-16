const mongoose = require("mongoose");

const SocialMediaSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  url: {
    type: String,
    required: true,
  },
  logo: {
    type: String,
    default: null,
  },
});

module.exports = mongoose.model("SocialMedia", SocialMediaSchema);