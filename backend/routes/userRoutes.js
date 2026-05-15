const express = require("express");

const { getStudents, createTeacher } = require("../controllers/userController");
const authorizeRoles = require("../middleware/role");

const router = express.Router();

router.get("/", authorizeRoles("teacher", "admin"), getStudents);
router.post("/teachers", authorizeRoles("admin"), createTeacher);

module.exports = router;
