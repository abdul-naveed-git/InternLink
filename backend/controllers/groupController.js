const mongoose = require("mongoose");
const Group = require("../models/Group");
const asyncHandler = require("../utils/asyncHandler");
const {
  validateGroupPayload,
  throwValidationError,
} = require("../utils/validators");

exports.getGroups = asyncHandler(async (req, res) => {
  const groups = await Group.find().sort({ name: 1 });

  res.json(groups);
});

exports.createGroup = asyncHandler(async (req, res) => {
  const sanitized = validateGroupPayload(req.body);

  const exists = await Group.findOne({ name: sanitized.name });
  if (exists) {
    const err = new Error("A group with that name already exists.");
    err.status = 409;
    throw err;
  }

  const group = await Group.create(sanitized);

  res.status(201).json(group);
});

exports.deleteGroup = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throwValidationError("Group ID is invalid.");
  }

  const group = await Group.findById(id);
  if (!group) {
    const err = new Error("Group not found");
    err.status = 404;
    throw err;
  }

  await group.deleteOne();

  res.json({
    message: "Group deleted",
    id: group._id,
  });
});
