const express = require("express");

const {
  getGroups,
  createGroup,
  deleteGroup,
  getPublicGroups,
} = require("../controllers/groupController");
const authorizeRoles = require("../middleware/role");
const requireAuth = require("../middleware/requireAuth");

const router = express.Router();

router.get("/public", getPublicGroups);
router.get("/", requireAuth, getGroups);
router.post("/", requireAuth, authorizeRoles("admin"), createGroup);
router.delete("/:id", requireAuth, authorizeRoles("admin"), deleteGroup);

module.exports = router;
