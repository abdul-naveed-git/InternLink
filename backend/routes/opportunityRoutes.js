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

const authorizeRoles = require("../middleware/role");

const router = express.Router();

router.get("/", getOpportunities);
router.get("/:id", getOpportunityById);

router.post("/", authorizeRoles("teacher", "admin"), createOpportunity);

router.put("/:id", authorizeRoles("teacher", "admin"), updateOpportunity);

router.delete(
  "/:id",
  authorizeRoles("teacher", "admin"),
  deleteOpportunity,
);

router.post("/:id/save", saveOpportunity);
router.post("/:id/apply", applyOpportunity);

module.exports = router;
