const express = require("express");
const {
  firebaseSession,
  refreshToken,
  logout,
  getCurrentUser,
  updateProfile,
} = require("../controllers/authController");
const requireAuth = require("../middleware/requireAuth");
const router = express.Router();

router.post("/firebase/session", firebaseSession);
router.post("/refresh", refreshToken);
router.post("/logout", logout);
router.get("/me", getCurrentUser);
router.put("/me", requireAuth, updateProfile);

module.exports = router;
