const express = require("express");
const router = express.Router();
const rechargeController = require("../controllers/rechargeController");
const { protectAdmin } = require("../middlewares/auth");

router.get("/recharges", protectAdmin, rechargeController.getAllRecharges);

router.get("/recharge/operators", protectAdmin, rechargeController.getAllRechargeOperators);

router.patch("/recharge/operator/:id/toggle-status", protectAdmin, rechargeController.toggleRechargeOperatorStatus);

router.get("/recharge/operator/:id", protectAdmin, rechargeController.getRechargeOperatorById);
router.post("/recharge/operator", protectAdmin, rechargeController.createRechargeOperator);
router.put("/recharge/operator/:id", protectAdmin, rechargeController.updateRechargeOperator);
router.delete("/recharge/operator/:id", protectAdmin, rechargeController.deleteRechargeOperator);


module.exports = router;