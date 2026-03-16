const jwt = require("jsonwebtoken");
const { createHttpError } = require("../utils/httpErrors");

const auth = (req, res, next) => {
  const token = req.cookies.accessToken;

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

    req.user = decoded;

    next();
  } catch (err) {
    return next(
      createHttpError(
        401,
        "Session expired or invalid. Please log in again.",
        "token_expired",
        true,
      ),
    );
  }
};

module.exports = auth;
