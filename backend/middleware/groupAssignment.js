const { createHttpError } = require("../utils/httpErrors");

const requireGroupAssignment = (req, res, next) => {
  if (req.user?.role === "student" && !req.user.groupId) {
    return next(
      createHttpError(403, "Please select your group first", "group_required"),
    );
  }
  next();
};

module.exports = requireGroupAssignment;
