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
});

module.exports = mongoose.model("SocialMedia", SocialMediaSchema);