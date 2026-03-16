const express = require("express");

const {
  createOpportunity,
  getOpportunities,
  getOpportunityById,
  updateOpportunity,
  deleteOpportunity,
  saveOpportunity,
  applyOpportunity,
} = require("../controllers/opportunityController");

const auth = require("../middleware/auth");
const authorizeRoles = require("../middleware/role");

const router = express.Router();

router.get("/", auth, getOpportunities);
router.get("/:id", auth, getOpportunityById);

router.post("/", auth, authorizeRoles("teacher", "admin"), createOpportunity);

router.put("/:id", auth, authorizeRoles("teacher", "admin"), updateOpportunity);

router.delete(
  "/:id",
  auth,
  authorizeRoles("teacher", "admin"),
  deleteOpportunity,
);

router.post("/:id/save", auth, saveOpportunity);
router.post("/:id/apply", auth, applyOpportunity);

module.exports = router;
