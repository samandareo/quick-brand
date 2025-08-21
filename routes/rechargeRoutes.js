const express = require("express");
const router = express.Router();
const rechargeController = require("../controllers/rechargeController");
const { protectUser, protectAdmin } = require("../middlewares/auth");

router.post("/recharge", protectUser, rechargeController.rechargeUser);
router.get("/recharges", protectAdmin, rechargeController.getAllRecharges);
router.get("/recharge/:id", protectUser, rechargeController.getRechargeById);