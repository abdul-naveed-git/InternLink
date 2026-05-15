const { createHttpError } = require("../utils/httpErrors");
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(createHttpError(403, "Access denied.", "forbidden", false));
    }
    next();
  };
};
module.exports = authorizeRoles;
