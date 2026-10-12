const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const authMiddleware = require("../middleware/auth.middleware");

// Public Auth Routes
router.post("/signup", authController.signup);
router.post("/signin", authController.signin);
router.post("/resend-otp", authController.resendOTP);
router.post("/verify", authController.verifyOTP);
router.get("/users/:id", authController.getUserById);

// Protected Auth Routes
router.get("/me", authMiddleware, authController.getMe);

module.exports = router;
