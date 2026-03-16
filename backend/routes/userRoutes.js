const express = require("express");

const { getStudents, createTeacher } = require("../controllers/userController");
const auth = require("../middleware/auth");
const authorizeRoles = require("../middleware/role");

const router = express.Router();

router.get("/", auth, authorizeRoles("teacher", "admin"), getStudents);
router.post(
  "/teachers",
  auth,
  authorizeRoles("admin"),
  createTeacher,
);

module.exports = router;
