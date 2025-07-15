const express = require("express");
const router = express.Router();
const operatorController = require("../controllers/operatorController");
const { protectAdmin } = require("../middlewares/auth");
const upload = require("../utils/multerConfig");

// Public routes
router.route("/").get(operatorController.getOperators);

router.route("/:id").get(operatorController.getOperator);

// Admin protected routes
router.use(protectAdmin);

router
  .route("/")
  .post(upload.single("image"), operatorController.createOperator);

router
  .route("/:id")
  .patch(upload.single("image"), operatorController.updateOperator)
  .delete(operatorController.deleteOperator);

router
  .route("/:id/toggle-status")
  .patch(operatorController.toggleOperatorStatus);

module.exports = router;
