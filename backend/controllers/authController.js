const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/User");
const Group = require("../models/Group");
const asyncHandler = require("../utils/asyncHandler");
const { generateAccessToken, generateRefreshToken } = require("../utils/token");
const {
  validateProfileUpdatePayload,
  throwValidationError,
} = require("../utils/validators");
const admin = require("../utils/firebaseAdminClient");
const { createHttpError } = require("../utils/httpErrors");
const { sendSuccess } = require("../utils/responseHelper");
const { verifyFirebaseIdToken } = require("../utils/firebaseAuth");

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
    needsGroupSelection: !groupId,
  };
};

const COOKIE_SECURE = process.env.NODE_ENV === "production";
const COOKIE_SAMESITE = COOKIE_SECURE ? "none" : "lax";

const ACCESS_TOKEN_MAX_AGE = 15 * 60 * 1000;
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

const cookieOptions = {
  httpOnly: true,
  sameSite: COOKIE_SAMESITE,
  secure: COOKIE_SECURE,
};

const setAuthCookies = (res, accessToken, refreshToken) => {
  res.cookie("accessToken", accessToken, {
    ...cookieOptions,
    maxAge: ACCESS_TOKEN_MAX_AGE,
  });

  res.cookie("refreshToken", refreshToken, {
    ...cookieOptions,
    maxAge: REFRESH_TOKEN_MAX_AGE,
  });
};

const createSessionForUser = async (user, res) => {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  user.refreshToken = refreshToken;
  user.lastLogin = new Date();
  await user.save();

  setAuthCookies(res, accessToken, refreshToken);

  console.info(
    `[auth] session created for ${user.email} (${user.role}) [${user._id}]`,
  );

  return sanitizeUser(user);
};

exports.firebaseSession = asyncHandler(async (req, res) => {
  const { idToken, name, groupId } = req.body;

  const firebaseUser = await verifyFirebaseIdToken(idToken);

  if (!firebaseUser.emailVerified) {
    return sendSuccess(res, {
      message: "Email not verified",
      data: {
        needsEmailVerification: true,
        user: null,
      },
    });
  }

  let user = await User.findOne({ email: firebaseUser.email });

  if (!user) {
    let group = null;

    if (groupId) {
      if (!mongoose.Types.ObjectId.isValid(groupId)) {
        throwValidationError("Invalid group selection.");
      }

      group = await Group.findById(groupId);

      if (!group) {
        throwValidationError("Group not found.");
      }
    }

    user = await User.create({
      name: name || firebaseUser.name,
      email: firebaseUser.email,
      firebaseUid: firebaseUser.uid,
      role: "student",
      groupId: group ? group._id : null,
      emailVerified: true,
    });
  }

  const safeUser = await createSessionForUser(user, res);

  sendSuccess(res, {
    message: "Session created",
    data: { user: safeUser },
  });
});

exports.refreshToken = asyncHandler(async (req, res) => {
  const oldRefreshToken = req.cookies.refreshToken;

  if (!oldRefreshToken) {
    throw createHttpError(401, "No refresh token");
  }

  let decoded;
  try {
    decoded = jwt.verify(oldRefreshToken, process.env.JWT_REFRESH_SECRET);
  } catch (err) {
    throw createHttpError(403, "Invalid or expired refresh token");
  }

  const user = await User.findById(decoded.userId);

  if (!user || user.refreshToken !== oldRefreshToken) {
    if (user) {
      user.refreshToken = null;
      await user.save();
    }
    throw createHttpError(403, "Invalid refresh token");
  }

  const newAccessToken = generateAccessToken(user);
  const newRefreshToken = generateRefreshToken(user);

  user.refreshToken = newRefreshToken;
  await user.save();

  setAuthCookies(res, newAccessToken, newRefreshToken);

  sendSuccess(res, {
    message: "Token rotated",
    data: null,
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

  res.clearCookie("accessToken", { ...cookieOptions });
  res.clearCookie("refreshToken", { ...cookieOptions });

  sendSuccess(res, {
    message: "Logged out successfully",
    data: null,
  });
});

const getTokenFromRequest = (req) => {
  let token = req.cookies?.accessToken;

  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(" ");
    if (parts[0] === "Bearer") {
      token = parts[1];
    }
  }

  return token;
};

exports.getCurrentUser = asyncHandler(async (req, res) => {
  const token = getTokenFromRequest(req);

  if (!token) {
    return sendSuccess(res, {
      message: "No active session",
      data: { user: null },
    });
  }

  let decoded;

  try {
    decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      throw createHttpError(401, "Access token expired", "token_expired", true);
    }
    throw createHttpError(401, "Invalid token", "invalid_token", true);
  }

  const user = await User.findById(decoded.userId);

  if (!user) {
    return sendSuccess(res, {
      message: "No active session",
      data: { user: null },
    });
  }

  sendSuccess(res, {
    message: "Current user loaded",
    data: { user: sanitizeUser(user) },
  });
});

exports.updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.userId);

  if (!user) {
    throw createHttpError(404, "User not found");
  }

  const { name, email, groupId, password } = req.body;

  const sanitized = validateProfileUpdatePayload({ name, email, password });

  if (email && email.trim().toLowerCase() !== user.email) {
    const emailTaken = await User.findOne({
      email: email.trim().toLowerCase(),
    });

    if (emailTaken && emailTaken._id.toString() !== user._id.toString()) {
      throw createHttpError(409, "Email already in use");
    }
  }

  if (groupId !== undefined) {
    if (groupId && groupId !== "null") {
      const group = await Group.findById(groupId);

      if (!group) {
        throw createHttpError(400, "Group not found");
      }

      user.groupId = group._id;
    } else {
      user.groupId = null;
    }
  }

  if (sanitized.name) user.name = sanitized.name;
  if (sanitized.email) user.email = sanitized.email;

  const firebaseUpdates = {};
  if (sanitized.email) {
    firebaseUpdates.email = sanitized.email;
  }
  if (sanitized.password) {
    firebaseUpdates.password = sanitized.password;
  }

  if (Object.keys(firebaseUpdates).length && user.firebaseUid) {
    try {
      await admin.auth().updateUser(user.firebaseUid, firebaseUpdates);
    } catch (err) {
      console.error("[auth] Firebase update failed:", err);
      throw createHttpError(
        500,
        "Unable to update authentication profile.",
        "firebase_update_failed",
      );
    }
  }

  await user.save();

  console.info(
    `[auth] profile updated for ${user.email} (${user.role}) [${user._id}]`,
  );

  sendSuccess(res, {
    message: "Profile updated",
    data: { user: sanitizeUser(user) },
  });
});
