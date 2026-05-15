const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");
const admin = require("../utils/firebaseAdminClient");
const { validateTeacherCreationPayload } = require("../utils/validators");
const { createHttpError } = require("../utils/httpErrors");
const { sendSuccess } = require("../utils/responseHelper");

exports.getStudents = asyncHandler(async (req, res) => {
  const students = await User.find({ role: "student" })
    .select("name email groupId")
    .lean();

  sendSuccess(res, {
    message: "Students loaded",
    data: students,
  });
});

exports.createTeacher = asyncHandler(async (req, res) => {
  const payload = validateTeacherCreationPayload(req.body);

  const existing = await User.findOne({ email: payload.email });
  if (existing) {
    throw createHttpError(409, "Email is already in use.", "email_conflict");
  }

  const firebaseUser = await admin.auth().createUser({
    email: payload.email,
    password: payload.password,
    displayName: payload.name,
    emailVerified: true,
  });

  const teacher = await User.create({
    name: payload.name,
    email: payload.email,
    role: "teacher",
    emailVerified: true,
    emailVerifiedAt: new Date(),
    firebaseUid: firebaseUser.uid,
  });

  sendSuccess(res, {
    message: "Teacher account created.",
    data: {
      user: {
        _id: teacher._id,
        name: teacher.name,
        email: teacher.email,
        role: teacher.role,
        createdAt: teacher.createdAt,
      },
    },
    status: 201,
  });
});
