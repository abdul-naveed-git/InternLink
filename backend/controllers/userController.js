const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");
const bcrypt = require("bcryptjs");
const { validateTeacherCreationPayload } = require("../utils/validators");
const { createHttpError } = require("../utils/httpErrors");
exports.getStudents = asyncHandler(async (req, res) => {
  const students = await User.find({ role: "student" })
    .select("name email groupId")
    .lean();

  res.json(students);
});

exports.createTeacher = asyncHandler(async (req, res) => {
  const payload = validateTeacherCreationPayload(req.body);

  const existing = await User.findOne({ email: payload.email });
  if (existing) {
    throw createHttpError(409, "Email is already in use.", "email_conflict");
  }

  const hashedPassword = await bcrypt.hash(payload.password, 10);

  const teacher = await User.create({
    name: payload.name,
    email: payload.email,
    password: hashedPassword,
    role: "teacher",
    emailVerified: true,
    emailVerifiedAt: new Date(),
  });

  const responseUser = {
    _id: teacher._id,
    name: teacher.name,
    email: teacher.email,
    role: teacher.role,
    createdAt: teacher.createdAt,
  };

  res.status(201).json({
    message: "Teacher account created.",
    user: responseUser,
  });
});
