const mongoose = require("mongoose");

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_PATTERN = /^https?:\/\/.+/i;
const ROLE_OPTIONS = ["student", "teacher"];

const throwValidationError = (message) => {
  const err = new Error(message);
  err.status = 400;
  throw err;
};

const ensureString = (value, fieldName) => {
  if (typeof value !== "string") {
    throwValidationError(`${fieldName} must be a string.`);
  }
  return value.trim();
};

const validateRegistrationPayload = ({
  name,
  email,
  password,
  role,
  groupId,
}) => {
  const trimmedName = ensureString(name, "Name");
  if (trimmedName.length < 3) {
    throwValidationError("Full name must be at least 3 characters long.");
  }

  const trimmedEmail = ensureString(email, "Email").toLowerCase();
  if (!EMAIL_PATTERN.test(trimmedEmail)) {
    throwValidationError("Provide a valid email address.");
  }

  if (!password || password.length < 8) {
    throwValidationError("Password must be at least 8 characters long.");
  }

  const selectedRole = role ? role.toLowerCase() : "student";
  if (!ROLE_OPTIONS.includes(selectedRole)) {
    throwValidationError("Invalid role selected.");
  }

  if (selectedRole === "student") {
    if (!groupId) {
      throwValidationError("Students must select an academic group.");
    }
  }

  const normalizedGroupId = groupId ? String(groupId).trim() : null;

  return {
    name: trimmedName,
    email: trimmedEmail,
    password,
    role: selectedRole,
    groupId: normalizedGroupId,
  };
};

const validateLoginPayload = ({ email, password }) => {
  const trimmedEmail = ensureString(email, "Email").toLowerCase();
  if (!EMAIL_PATTERN.test(trimmedEmail)) {
    throwValidationError("Provide a valid email for login.");
  }

  if (!password) {
    throwValidationError("Password is required for login.");
  }

  return {
    email: trimmedEmail,
    password,
  };
};

const validateProfileUpdatePayload = ({ name, email, password }) => {
  const payload = {};

  if (name !== undefined) {
    const trimmedName = ensureString(name, "Name");
    if (trimmedName.length < 3) {
      throwValidationError("Name must be at least 3 characters long.");
    }
    payload.name = trimmedName;
  }

  if (email !== undefined) {
    const trimmedEmail = ensureString(email, "Email").toLowerCase();
    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      throwValidationError("Provide a valid email address.");
    }
    payload.email = trimmedEmail;
  }

  if (password !== undefined && password !== "") {
    if (password.length < 8) {
      throwValidationError("Password must be at least 8 characters long.");
    }
    payload.password = password;
  }

  return payload;
};

const ensureObjectIdList = (value, fieldName) => {
  if (!Array.isArray(value) || value.length === 0) {
    throwValidationError(`${fieldName} must be a non-empty array.`);
  }
  const normalized = value.map((item) => {
    const id = String(item).trim();
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throwValidationError(`${fieldName} contains an invalid ID.`);
    }
    return id;
  });
  return [...new Set(normalized)];
};

const validateOpportunityPayload = (payload = {}, options = {}) => {
  const { partial = false } = options;
  const result = {};

  const checkRequired = (value, fieldName) => {
    if (value === undefined || value === null || value === "") {
      throwValidationError(`${fieldName} is required.`);
    }
  };

  const setStringField = (value, fieldName, minLength = 1) => {
    const trimmed = ensureString(value, fieldName);
    if (trimmed.length < minLength) {
      throwValidationError(
        `${fieldName} must be at least ${minLength} characters.`,
      );
    }
    result[fieldName] = trimmed;
  };

  if (!partial) {
    [
      "title",
      "company",
      "description",
      "category",
      "deadline",
      "applyLink",
      "targetGroups",
    ].forEach((field) =>
      checkRequired(
        payload[field],
        field.charAt(0).toUpperCase() + field.slice(1),
      ),
    );
  }

  if (payload.title !== undefined) {
    setStringField(payload.title, "title", 3);
  }

  if (payload.company !== undefined) {
    setStringField(payload.company, "company", 2);
  }

  if (payload.description !== undefined) {
    setStringField(payload.description, "description", 20);
  }

  if (payload.category !== undefined) {
    const category = String(payload.category).toLowerCase();
    if (!["internship", "job", "hackathon"].includes(category)) {
      throwValidationError("Invalid opportunity category.");
    }
    result.category = category;
  }

  if (payload.applyLink !== undefined) {
    const trimmed = ensureString(payload.applyLink, "Apply link");
    if (!URL_PATTERN.test(trimmed)) {
      throwValidationError("Provide a valid URL for the application link.");
    }
    result.applyLink = trimmed;
  }

  if (payload.deadline !== undefined) {
    const deadlineDate = new Date(payload.deadline);
    if (Number.isNaN(deadlineDate.getTime())) {
      throwValidationError("Provide a valid deadline date.");
    }
    if (deadlineDate.getTime() <= Date.now()) {
      throwValidationError("Deadline must be in the future.");
    }
    result.deadline = deadlineDate;
  }

  if (payload.targetGroups !== undefined) {
    result.targetGroups = ensureObjectIdList(
      payload.targetGroups,
      "Target groups",
    );
  }

  return result;
};

const validateTeacherCreationPayload = ({ name, email, password }) => {
  const trimmedName = ensureString(name, "Name");
  if (trimmedName.length < 3) {
    throwValidationError("Teacher name must be at least 3 characters long.");
  }

  const trimmedEmail = ensureString(email, "Email").toLowerCase();
  if (!EMAIL_PATTERN.test(trimmedEmail)) {
    throwValidationError("Provide a valid email address.");
  }

  if (!password || password.length < 8) {
    throwValidationError("Password must be at least 8 characters long.");
  }

  return {
    name: trimmedName,
    email: trimmedEmail,
    password,
  };
};

const validateGroupPayload = ({ name, branch, year }) => {
  const groupName = ensureString(name, "Group name");
  if (groupName.length < 3) {
    throwValidationError("Group name must be at least 3 characters long.");
  }

  const branchValue = ensureString(branch, "Branch").toUpperCase();
  if (branchValue.length < 2 || branchValue.length > 6) {
    throwValidationError("Branch code must be 2-6 characters.");
  }

  const numericYear = Number(year);
  if (!Number.isInteger(numericYear) || numericYear < 1 || numericYear > 4) {
    throwValidationError("Year must be an integer between 1 and 4.");
  }

  return {
    name: groupName,
    branch: branchValue,
    year: numericYear,
  };
};

module.exports = {
  validateRegistrationPayload,
  validateLoginPayload,
  validateProfileUpdatePayload,
  validateOpportunityPayload,
  throwValidationError,
  validateGroupPayload,
  validateTeacherCreationPayload,
};
