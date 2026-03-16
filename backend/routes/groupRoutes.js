const express = require("express");

const {
  getGroups,
  createGroup,
  deleteGroup,
} = require("../controllers/groupController");
const auth = require("../middleware/auth");
const authorizeRoles = require("../middleware/role");

const router = express.Router();

router.get("/", getGroups);
router.post("/", auth, authorizeRoles("admin"), createGroup);
router.delete("/:id", auth, authorizeRoles("admin"), deleteGroup);

module.exports = router;
