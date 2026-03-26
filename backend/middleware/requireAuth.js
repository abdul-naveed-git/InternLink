const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { createHttpError } = require("../utils/httpErrors");

const requireAuth = async (req, res, next) => {
  let token = req.cookies?.accessToken;
  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(" ");
    if (parts[0] === "Bearer") {
      token = parts[1];
    }
  }

  if (!token) {
    return next(
      createHttpError(
        401,
        "Authentication required. Please log in.",
        "unauthorized",
        true,
      ),
    );
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    const user = await User.findById(decoded.userId).select(
      "_id name email role groupId",
    );

    if (!user) {
      return next(
        createHttpError(401, "User no longer exists.", "user_deleted", true),
      );
    }

    if (!user.role) {
      return next(
        createHttpError(
          403,
          "User role missing. Please contact support.",
          "role_missing",
        ),
      );
    }

    req.user = {
      userId: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      groupId: user.groupId,
    };
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return next(
        createHttpError(401, "Access token expired", "token_expired", true),
      );
    }
    return next(createHttpError(401, "Invalid token", "invalid_token", true));
  }
};

module.exports = requireAuth;
