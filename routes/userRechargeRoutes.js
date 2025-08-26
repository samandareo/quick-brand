const express = require("express");
const router = express.Router();
const rechargeController = require("../controllers/rechargeController");
const { protectUser } = require("../middlewares/auth");

router.post("/", protectUser, rechargeController.rechargeUser);
router.get("/", protectUser, rechargeController.getRecharges);

module.exports = router;