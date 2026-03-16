const Opportunity = require("../models/Opportunity");
const Group = require("../models/Group");
const asyncHandler = require("../utils/asyncHandler");
const {
  validateOpportunityPayload,
  throwValidationError,
} = require("../utils/validators");

// CREATE OPPORTUNITY
exports.createOpportunity = asyncHandler(async (req, res) => {
  const sanitized = validateOpportunityPayload(req.body);

  const validGroups = await Group.countDocuments({
    _id: { $in: sanitized.targetGroups },
  });

  if (validGroups !== sanitized.targetGroups.length) {
    throwValidationError("One or more selected groups are invalid.");
  }

  const opportunity = await Opportunity.create({
    ...sanitized,
    createdBy: req.user.userId,
  });

  res.status(201).json(opportunity);
});

// GET OPPORTUNITIES
exports.getOpportunities = asyncHandler(async (req, res) => {
  const { groupId } = req.query;

  let query = {};

  if (groupId && groupId !== "null") {
    query.targetGroups = groupId;
  }

  const opportunities = await Opportunity.find(query)
    .sort({ deadline: 1 })
    .populate("createdBy", "name role");

  res.json(opportunities);
});

// GET SINGLE OPPORTUNITY
exports.getOpportunityById = asyncHandler(async (req, res) => {
  const opportunity = await Opportunity.findById(req.params.id).populate(
    "createdBy",
    "name email role",
  );

  if (!opportunity) {
    const err = new Error("Opportunity not found");
    err.status = 404;
    throw err;
  }

  res.json(opportunity);
});

// UPDATE OPPORTUNITY
exports.updateOpportunity = asyncHandler(async (req, res) => {
  const opportunity = await Opportunity.findById(req.params.id);

  if (!opportunity) {
    const err = new Error("Opportunity not found");
    err.status = 404;
    throw err;
  }

  // only creator or admin can update
  if (
    opportunity.createdBy.toString() !== req.user.userId &&
    req.user.role !== "admin"
  ) {
    const err = new Error("Not authorized");
    err.status = 403;
    throw err;
  }

  const sanitized = validateOpportunityPayload(req.body, { partial: true });

  if (!Object.keys(sanitized).length) {
    throwValidationError("Provide at least one valid field when updating.");
  }

  if (sanitized.targetGroups) {
    const validGroups = await Group.countDocuments({
      _id: { $in: sanitized.targetGroups },
    });
    if (validGroups !== sanitized.targetGroups.length) {
      throwValidationError("One or more selected groups are invalid.");
    }
  }

  Object.assign(opportunity, sanitized);

  await opportunity.save();

  res.json(opportunity);
});

// DELETE OPPORTUNITY
exports.deleteOpportunity = asyncHandler(async (req, res) => {
  const opportunity = await Opportunity.findById(req.params.id);

  if (!opportunity) {
    const err = new Error("Opportunity not found");
    err.status = 404;
    throw err;
  }

  if (
    opportunity.createdBy.toString() !== req.user.userId &&
    req.user.role !== "admin"
  ) {
    const err = new Error("Not authorized");
    err.status = 403;
    throw err;
  }

  await opportunity.deleteOne();

  res.json({
    message: "Opportunity deleted successfully",
  });
});

// SAVE / UNSAVE OPPORTUNITY
exports.saveOpportunity = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const opportunityId = req.params.id;

  const opportunity = await Opportunity.findById(opportunityId);

  if (!opportunity) {
    const err = new Error("Opportunity not found");
    err.status = 404;
    throw err;
  }

  const alreadySaved = opportunity.savedBy.includes(userId);

  if (alreadySaved) {
    opportunity.savedBy.pull(userId);

    await opportunity.save();

    return res.json({
      saved: false,
      opportunity,
    });
  }

  opportunity.savedBy.addToSet(userId);

  await opportunity.save();

  res.json({
    saved: true,
    opportunity,
  });
});

// APPLY
exports.applyOpportunity = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const opportunityId = req.params.id;

  const opportunity = await Opportunity.findOne({
    _id: opportunityId,
    deadline: { $gt: new Date() },
  });

  if (!opportunity) {
    const err = new Error("Opportunity expired or not found");
    err.status = 404;
    throw err;
  }

  opportunity.appliedBy.addToSet(userId);

  await opportunity.save();

  res.json({
    message: "Application successful",
    opportunity,
  });
});
