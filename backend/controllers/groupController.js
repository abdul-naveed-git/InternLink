const mongoose = require("mongoose");
const Group = require("../models/Group");
const User = require("../models/User");
const Opportunity = require("../models/Opportunity");
const asyncHandler = require("../utils/asyncHandler");
const { createHttpError } = require("../utils/httpErrors");
const { validateGroupPayload } = require("../utils/validators");
const { sendSuccess } = require("../utils/responseHelper");
exports.getPublicGroups = asyncHandler(async (req, res) => {
  const groups = await Group.find({}, "name branch year").sort({ name: 1 }).lean();
  sendSuccess(res, {
    message: "Groups loaded",
    data: groups,
  });
});

exports.getGroups = asyncHandler(async (req, res) => {
  const { user } = req;

  if (!user) {
    throw createHttpError(401, "Authentication required", "unauthorized");
  }

  const filter = {};
  if (user.role === "student") {
    if (!user.groupId) {
      return sendSuccess(res, {
        message: "No group assigned",
        data: [],
      });
    }
    filter._id = user.groupId;
  }

  const groups = await Group.find(filter).sort({ name: 1 }).lean();
  sendSuccess(res, {
    message: "Groups loaded",
    data: groups,
  });
});
exports.createGroup = asyncHandler(async (req, res) => {
  const sanitized = validateGroupPayload(req.body);
  const exists = await Group.findOne({
    name: sanitized.name.toLowerCase(),
    branch: sanitized.branch,
    year: sanitized.year,
  });
  if (exists) {
    throw createHttpError(
      409,
      "A group with that name already exists.",
      "group_conflict",
    );
  }
  const group = await Group.create(sanitized);
  sendSuccess(res, {
    message: "Group created",
    data: group,
    status: 201,
  });
});
exports.deleteGroup = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw createHttpError(400, "Invalid group ID");
  }

  const group = await Group.findById(id);
  if (!group) {
    throw createHttpError(404, "Group not found");
  }

  await User.updateMany({ groupId: id }, { $set: { groupId: null } });

  await Opportunity.updateMany(
    { targetGroups: id },
    { $pull: { targetGroups: id } },
  );

  await group.deleteOne();

  sendSuccess(res, {
    message: "Group deleted and references cleaned",
    data: null,
  });
});
