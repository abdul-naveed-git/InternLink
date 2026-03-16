class HttpError extends Error {
  constructor(status, message, code, needsLogin = false) {
    super(message);
    this.status = status;
    this.code = code;
    this.needsLogin = needsLogin;
  }
}

const createHttpError = (status, message, code, needsLogin = false) =>
  new HttpError(status, message, code, needsLogin);

module.exports = {
  HttpError,
  createHttpError,
};
