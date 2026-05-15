const sendSuccess = (
  res,
  { message = " Operation successful", data = null, status = 200 } = {},
) => res.status(status).json({ success: true, message, data });

module.exports = {
  sendSuccess,
};
