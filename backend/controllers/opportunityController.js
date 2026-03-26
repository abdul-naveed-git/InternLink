const mongoose = require("mongoose");
const Opportunity = require("../models/Opportunity");
const Group = require("../models/Group");
const asyncHandler = require("../utils/asyncHandler");
const { createHttpError } = require("../utils/httpErrors");
const {
  validateOpportunityPayload,
  throwValidationError,
} = require("../utils/validators");
const { sendSuccess } = require("../utils/responseHelper");

const toStringId = (value) =>
  value == null ? "" : typeof value === "string" ? value : value.toString();

const sanitizeOpportunityForViewer = (opportunity, user) => {
  const savedByArray = Array.isArray(opportunity.savedBy)
    ? opportunity.savedBy
    : [];
  const appliedByArray = Array.isArray(opportunity.appliedBy)
    ? opportunity.appliedBy
    : [];
  const viewerId = toStringId(user.userId);
  const savedIds = savedByArray.map(toStringId);
  const appliedIds = appliedByArray.map(toStringId);
  const isSaved = viewerId && savedIds.includes(viewerId);
  const hasApplied = viewerId && appliedIds.includes(viewerId);

  const base = {
    ...opportunity,
    savedByCount: savedIds.length,
    appliedByCount: appliedIds.length,
    isSaved,
    hasApplied,
  };

  if (user.role === "student") {
    return {
      ...base,
      savedBy: isSaved ? [user.userId] : [],
      appliedBy: hasApplied ? [user.userId] : [],
    };
  }

  return base;
};
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
  sendSuccess(res, {
    message: "Opportunity created",
    data: opportunity,
    status: 201,
  });
});
exports.getOpportunities = asyncHandler(async (req, res) => {
  const { groupId } = req.query;
  const user = req.user;

  if (!user) {
    throw createHttpError(401, "Authentication required", "unauthorized");
  }

  const query = {};
  if (user.role === "student") {
    if (!user.groupId) {
      return sendSuccess(res, {
        message: "No opportunities available",
        data: [],
      });
    }
    query.targetGroups = user.groupId;
  } else if (
    groupId &&
    mongoose.Types.ObjectId.isValid(groupId) &&
    groupId !== "null"
  ) {
    query.targetGroups = groupId;
  }

  const opportunities = await Opportunity.find(query)
    .sort({ deadline: 1 })
    .populate("createdBy", "name role")
    .lean();

  const sanitized = opportunities.map((opportunity) =>
    sanitizeOpportunityForViewer(opportunity, user),
  );

  sendSuccess(res, {
    message: "Opportunities loaded",
    data: sanitized,
  });
});
exports.getOpportunityById = asyncHandler(async (req, res) => {
  const { user } = req;
  const opportunity = await Opportunity.findById(req.params.id)
    .populate("createdBy", "name email role")
    .lean();

  if (!opportunity) {
    throw createHttpError(404, "Opportunity not found");
  }

  if (user?.role === "student") {
    const targetIds = (opportunity.targetGroups || []).map(toStringId);
    const groupId = toStringId(user.groupId);
    if (!groupId || !targetIds.includes(groupId)) {
      throw createHttpError(404, "Opportunity not found");
    }
  }

  const sanitized = sanitizeOpportunityForViewer(opportunity, user);

  sendSuccess(res, {
    message: "Opportunity retrieved",
    data: sanitized,
  });
});
exports.updateOpportunity = asyncHandler(async (req, res) => {
  const opportunity = await Opportunity.findById(req.params.id);
  if (!opportunity) {
    const err = new Error("Opportunity not found");
    err.status = 404;
    throw err;
  }
  if (
    opportunity.createdBy.toString() !== req.user.userId.toString() &&
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
  sendSuccess(res, {
    message: "Opportunity updated",
    data: opportunity,
  });
});
exports.deleteOpportunity = asyncHandler(async (req, res) => {
  const opportunity = await Opportunity.findById(req.params.id);
  if (!opportunity) {
    const err = new Error("Opportunity not found");
    err.status = 404;
    throw err;
  }
  if (
    opportunity.createdBy.toString() !== req.user.userId.toString() &&
    req.user.role !== "admin"
  ) {
    const err = new Error("Not authorized");
    err.status = 403;
    throw err;
  }
  await opportunity.deleteOne();
  sendSuccess(res, {
    message: "Opportunity deleted successfully",
    data: null,
  });
});
exports.saveOpportunity = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const opportunityId = req.params.id;
  const opportunity = await Opportunity.findById(opportunityId);
  if (!opportunity) {
    const err = new Error("Opportunity not found");
    err.status = 404;
    throw err;
  }
  const alreadySaved = opportunity.savedBy.some(
    (id) => id.toString() === userId.toString(),
  );
  if (alreadySaved) {
    opportunity.savedBy.pull(userId);
    await opportunity.save();
    return sendSuccess(res, {
      message: "Removed from saved list",
      data: { saved: false, opportunity },
    });
  }
  opportunity.savedBy.addToSet(userId);
  await opportunity.save();
  const sanitized = sanitizeOpportunityForViewer(
    opportunity.toObject(),
    req.user,
  );
  sendSuccess(res, {
    message: "Saved opportunity",
    data: { saved: true, opportunity: sanitized },
  });
});
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
  if (opportunity.appliedBy.includes(userId)) {
    throw createHttpError(400, "You have already applied");
  }
  opportunity.appliedBy.addToSet(userId);
  await opportunity.save();
  const sanitized = sanitizeOpportunityForViewer(
    opportunity.toObject(),
    req.user,
  );
  sendSuccess(res, {
    message: "Application successful",
    data: { opportunity: sanitized },
  });
});
