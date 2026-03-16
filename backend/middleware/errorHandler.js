const { HttpError } = require("../utils/httpErrors");

const errorHandler = (err, req, res, next) => {
  const status = err.status || 500;
  const shouldLog =
    process.env.NODE_ENV !== "production" || status >= 500 || !(err instanceof HttpError);

  if (shouldLog) {
    console.error(err);
  } else {
    console.warn("Handled error:", err.message);
  }

  res.status(status).json({
    message: err.message || "Server error",
    code: err.code || "server_error",
    needsLogin: err.needsLogin || false,
  });
};

module.exports = errorHandler;
