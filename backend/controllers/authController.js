const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const Group = require("../models/Group");
const asyncHandler = require("../utils/asyncHandler");
const { generateAccessToken, generateRefreshToken } = require("../utils/token");
const {
  validateRegistrationPayload,
  validateLoginPayload,
  validateProfileUpdatePayload,
  throwValidationError,
} = require("../utils/validators");
const { createHttpError } = require("../utils/httpErrors");
const { sendMail } = require("../utils/mailer");
const EmailVerification = require("../models/EmailVerification");

const sanitizeUser = (user) => {
  const {
    _id,
    name,
    email,
    role,
    groupId,
    createdAt,
    updatedAt,
    emailVerified,
  } = user.toObject();
  return {
    _id,
    name,
    email,
    role,
    groupId,
    createdAt,
    updatedAt,
    emailVerified,
  };
};

const OTP_TTL_MINUTES = Number(process.env.OTP_TTL_MINUTES) || 10;

const generateOtp = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

const setOtpFields = async (user, purpose) => {
  user.otpCode = generateOtp();
  user.otpPurpose = purpose;
  user.otpExpiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
  await user.save();
  return user.otpCode;
};

const clearOtpFields = (user) => {
  user.otpCode = null;
  user.otpPurpose = null;
  user.otpExpiresAt = null;
};

const isOtpValid = (user, code, purpose) => {
  if (!user || !user.otpCode || !user.otpPurpose) {
    return false;
  }
  if (user.otpPurpose !== purpose) {
    return false;
  }
  if (!user.otpExpiresAt || user.otpExpiresAt.getTime() < Date.now()) {
    return false;
  }
  return String(user.otpCode) === String(code);
};

const sendOtpEmail = async ({ to, code, purpose }) => {
  const subjects = {
    password_change: "Confirm your password change",
    password_reset: "Reset your password",
    email_verification: "Verify your email address",
  };

  const purposeCopy = {
    password_change: "You requested a password change.",
    password_reset: "You requested a password reset.",
    email_verification: "Please verify your email address to continue.",
  };

  const subject = subjects[purpose] ?? "Secure code";
  const purposeText = purposeCopy[purpose] ?? "Here is your verification code.";
  const html = `<p>${purposeText}</p><p>Your OTP is <strong>${code}</strong>. It expires in ${OTP_TTL_MINUTES} minutes.</p>`;
  const text = `${purposeText} Your OTP is ${code}. It expires in ${OTP_TTL_MINUTES} minutes.`;
  await sendMail({ to, subject, html, text });
};

const EMAIL_VERIFICATION_PURPOSE = "registration";

const createEmailVerification = async (email) => {
  const code = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  const verification = await EmailVerification.findOneAndUpdate(
    { email: email.toLowerCase(), purpose: EMAIL_VERIFICATION_PURPOSE },
    {
      code,
      expiresAt,
      used: false,
    },
    { upsert: true, new: true },
  );

  return verification;
};

const useEmailVerification = async ({ verificationId, email, code }) => {
  if (!verificationId || !code) {
    throwValidationError("Verification code is required.");
  }
  const record = await EmailVerification.findOne({
    _id: verificationId,
    email: email.toLowerCase(),
    purpose: EMAIL_VERIFICATION_PURPOSE,
  });

  if (
    !record ||
    record.used ||
    record.code !== code ||
    !record.expiresAt ||
    record.expiresAt.getTime() < Date.now()
  ) {
    throw createHttpError(
      400,
      "Invalid or expired verification code.",
      "invalid_otp",
    );
  }

  record.used = true;
  await record.save();

  return record;
};

exports.register = asyncHandler(async (req, res) => {
  const sanitized = validateRegistrationPayload(req.body);

  if (sanitized.role !== "student") {
    throwValidationError("Only students can register themselves.");
  }
  if (sanitized.role === "student") {
    const group = await Group.findById(sanitized.groupId);
    if (!group) {
      throwValidationError("Selected academic group does not exist.");
    }
    sanitized.groupId = group._id;
  }

  const verificationRecord = await EmailVerification.findOne({
    email: sanitized.email,
    purpose: EMAIL_VERIFICATION_PURPOSE,
    used: true,
  });
  if (!verificationRecord) {
    throwValidationError("Email must be verified before creating an account.");
  }

  const hashedPassword = await bcrypt.hash(sanitized.password, 10);

  const user = await User.create({
    name: sanitized.name,
    email: sanitized.email,
    password: hashedPassword,
    role: sanitized.role,
    groupId: sanitized.groupId,
    emailVerified: true,
    emailVerifiedAt: new Date(),
  });

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  user.refreshToken = refreshToken;
  await user.save();

  const safeUser = sanitizeUser(user);

  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    sameSite: "none",
    secure: true,
    maxAge: 15 * 60 * 1000,
  });

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    sameSite: "none",
    secure: true,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.status(201).json({
    message: "User created",
    user: safeUser,
  });
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = validateLoginPayload(req.body);

  const user = await User.findOne({ email });

  if (!user) {
    throw createHttpError(
      401,
      "Invalid credentials",
      "invalid_credentials",
      true,
    );
  }

  const valid = await bcrypt.compare(password, user.password);

  if (!valid) {
    throw createHttpError(
      401,
      "Invalid credentials",
      "invalid_credentials",
      true,
    );
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  user.refreshToken = refreshToken;
  await user.save();

  const safeUser = sanitizeUser(user);

  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: 15 * 60 * 1000,
  });

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({
    message: "Login successful",
    user: safeUser,
  });
});

exports.refreshToken = asyncHandler(async (req, res) => {
  const oldRefreshToken = req.cookies.refreshToken;

  if (!oldRefreshToken) {
    const err = new Error("No refresh token");
    err.status = 401;
    throw err;
  }

  const decoded = jwt.verify(oldRefreshToken, process.env.JWT_REFRESH_SECRET);

  const user = await User.findById(decoded.userId);

  if (!user || user.refreshToken !== oldRefreshToken) {
    const err = new Error("Invalid refresh token");
    err.status = 403;
    throw err;
  }

  const newAccessToken = generateAccessToken(user);
  const newRefreshToken = generateRefreshToken(user);

  user.refreshToken = newRefreshToken;
  await user.save();

  res.cookie("accessToken", newAccessToken, {
    httpOnly: true,
    sameSite: "strict",
    secure: false,
    maxAge: 15 * 60 * 1000,
  });

  res.cookie("refreshToken", newRefreshToken, {
    httpOnly: true,
    sameSite: "strict",
    secure: false,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({
    message: "Token rotated",
  });
});

exports.logout = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (refreshToken) {
    const user = await User.findOne({ refreshToken });

    if (user) {
      user.refreshToken = null;
      await user.save();
    }
  }

  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");

  res.json({
    message: "Logged out successfully",
  });
});

exports.getCurrentUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.userId);

  if (!user) {
    const err = new Error("User not found");
    err.status = 404;
    throw err;
  }

  res.json({
    user: sanitizeUser(user),
  });
});

exports.updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.userId);

  if (!user) {
    const err = new Error("User not found");
    err.status = 404;
    throw err;
  }

  const { name, email, password, groupId } = req.body;
  const sanitized = validateProfileUpdatePayload({ name, email, password });
  if (email && email.trim().toLowerCase() !== user.email) {
    const emailTaken = await User.findOne({
      email: email.trim().toLowerCase(),
    });
    if (emailTaken && emailTaken._id.toString() !== user._id.toString()) {
      const err = new Error("Email is already in use");
      err.status = 409;
      throw err;
    }
  }

  if (groupId !== undefined) {
    if (groupId && groupId !== "null") {
      const group = await Group.findById(groupId);
      if (!group) {
        const err = new Error("Selected group does not exist");
        err.status = 400;
        throw err;
      }
      user.groupId = group._id;
    } else {
      user.groupId = null;
    }
  }

  if (sanitized.name) {
    user.name = sanitized.name;
  }

  if (sanitized.email) {
    user.email = sanitized.email;
  }

  if (sanitized.password) {
    user.password = await bcrypt.hash(sanitized.password, 10);
  }

  await user.save();

  res.json({
    user: sanitizeUser(user),
  });
});

exports.forgotPassword = asyncHandler(async (req, res) => {
  const email = (req.body.email ?? "").trim().toLowerCase();
  if (!email) {
    throwValidationError("Email is required for password reset.");
  }

  const user = await User.findOne({ email });
  if (!user) {
    return res.json({
      message: "Please Enter a Valid Email You Have Registered.",
    });
  }

  const code = await setOtpFields(user, "password_reset");
  await sendOtpEmail({ to: user.email, code, purpose: "password_reset" });

  res.json({
    message: "An OTP has been sent to your email address.",
  });
});

exports.confirmForgotPassword = asyncHandler(async (req, res) => {
  const email = (req.body.email ?? "").trim().toLowerCase();
  const { code, newPassword } = req.body;

  if (!email) {
    throwValidationError("Email is required.");
  }
  if (!code) {
    throwValidationError("OTP code is required.");
  }
  if (!newPassword || newPassword.length < 8) {
    throwValidationError("New password must be at least 8 characters.");
  }

  const user = await User.findOne({ email });
  if (!user || !isOtpValid(user, code, "password_reset")) {
    throw createHttpError(400, "Invalid or expired OTP.", "invalid_otp");
  }

  user.password = await bcrypt.hash(newPassword, 10);
  clearOtpFields(user);
  user.refreshToken = null;
  await user.save();

  res.json({
    message: "Password has been reset.",
  });
});

exports.requestEmailVerification = asyncHandler(async (req, res) => {
  const email = (req.body.email ?? "").trim().toLowerCase();
  if (!email) {
    throwValidationError("Email is required.");
  }

  const verification = await createEmailVerification(email);

  await sendOtpEmail({
    to: email,
    code: verification.code,
    purpose: "email_verification",
  });

  res.json({
    message: "An OTP has been sent to your email address.",
    verificationId: verification._id,
  });
});

exports.confirmEmailVerification = asyncHandler(async (req, res) => {
  const email = (req.body.email ?? "").trim().toLowerCase();
  const { code, verificationId } = req.body;

  if (!email) {
    throwValidationError("Email is required.");
  }
  if (!code) {
    throwValidationError("OTP code is required.");
  }

  const record = await useEmailVerification({
    verificationId,
    email,
    code,
  });

  const user = await User.findOne({ email });
  if (user && !user.emailVerified) {
    user.emailVerified = true;
    user.emailVerifiedAt = new Date();
    await user.save();
  }

  res.json({
    message: "Email has been verified.",
    verificationId: record._id,
  });
});

exports.requestPasswordChange = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.userId);
  if (!user) {
    throw createHttpError(404, "User not found.", "user_not_found");
  }

  const code = await setOtpFields(user, "password_change");
  await sendOtpEmail({ to: user.email, code, purpose: "password_change" });

  res.json({
    message: "OTP sent to your email to confirm the password change.",
  });
});

exports.confirmPasswordChange = asyncHandler(async (req, res) => {
  const { code, newPassword } = req.body;
  if (!code) {
    throwValidationError("OTP code is required.");
  }
  if (!newPassword || newPassword.length < 8) {
    throwValidationError("New password must be at least 8 characters.");
  }

  const user = await User.findById(req.user.userId);
  if (!user || !isOtpValid(user, code, "password_change")) {
    throw createHttpError(400, "Invalid or expired OTP.", "invalid_otp");
  }

  user.password = await bcrypt.hash(newPassword, 10);
  clearOtpFields(user);
  user.refreshToken = null;
  await user.save();

  res.json({
    message: "Password has been updated.",
  });
});
