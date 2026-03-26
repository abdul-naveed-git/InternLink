const { HttpError } = require("../utils/httpErrors");
const errorHandler = (err, req, res, next) => {
  const status = err.status || 500;
  const shouldLog =
    process.env.NODE_ENV !== "production" ||
    status >= 500 ||
    !(err instanceof HttpError);
  if (shouldLog) {
    console.error(err);
  } else {
    console.warn("Handled error:", err.message);
  }
  const payload = {
    success: false,
    message: err.message || "Server error",
    code: err.code || "server_error",
  };
  if (err.needsLogin) {
    payload.needsLogin = true;
  }
  res.status(status).json(payload);
};
module.exports = errorHandler;
