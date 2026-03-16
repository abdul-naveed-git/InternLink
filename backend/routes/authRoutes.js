const express = require("express");

const {
  register,
  login,
  refreshToken,
  logout,
  getCurrentUser,
  updateProfile,
  forgotPassword,
  confirmForgotPassword,
  requestPasswordChange,
  confirmPasswordChange,
  requestEmailVerification,
  confirmEmailVerification,
} = require("../controllers/authController");
const auth = require("../middleware/auth");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", auth, getCurrentUser);
router.put("/me", auth, updateProfile);
router.post("/refresh", refreshToken);
router.post("/logout", logout);
router.post("/forgot-password", forgotPassword);
router.post("/forgot-password/confirm", confirmForgotPassword);
router.post("/verify-email/request", requestEmailVerification);
router.post("/verify-email/confirm", confirmEmailVerification);
router.post("/password-change/request", auth, requestPasswordChange);
router.post("/password-change/confirm", auth, confirmPasswordChange);

module.exports = router;
