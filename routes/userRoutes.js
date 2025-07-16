const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { protectUser, protectAdmin } = require("../middlewares/auth");

// Public routes
router.route("/register").post(userController.register);
router.route("/login").post(userController.login);
router.route("/social-media").get(userController.getSocialMedia); // Social media routes

// Protected user routes
router.route("/me").get(protectUser, userController.getMe);
router.route("/update").patch(protectUser, userController.updateUser);
router
  .route("/update-password")
  .patch(protectUser, userController.updatePassword);

router.route("/logout").post(protectUser, userController.logout);

router.route("/referrals").get(protectUser, userController.getReferrals);

// Admin routes for user management
router.route("/").get(protectAdmin, userController.getUsers);
router
  .route("/:id")
  .get(protectAdmin, userController.getUser)
  .patch(protectAdmin, userController.updateUser)
  .delete(protectAdmin, userController.deleteUser);


module.exports = router;
