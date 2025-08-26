const express = require("express");
const router = express.Router();
const rechargeController = require("../controllers/rechargeController");
const { protectAdmin } = require("../middlewares/auth");

router.get("/recharges", protectAdmin, rechargeController.getAllRecharges);

module.exports = router;