import express from "express";
import * as authController from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public Routes
router.post("/register", authController.registerUser);
router.post("/login", authController.loginUser);
router.post("/forgot-password", authController.forgotPassword); // Sends OTP
router.post("/reset-password", authController.resetPassword); // Verifies OTP + sets new password

// Protected Route
router.get("/me", protect, authController.getCurrentUser);

export default router;
