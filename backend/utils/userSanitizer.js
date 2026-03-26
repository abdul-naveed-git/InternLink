const sanitizeUser = (userDoc) => {
  if (!userDoc) return null;
  const {
    _id,
    name,
    email,
    role,
    groupId,
    createdAt,
    updatedAt,
    emailVerified,
  } = userDoc.toObject ? userDoc.toObject() : userDoc;

  return {
    _id,
    name,
    email,
    role,
    groupId,
    createdAt,
    updatedAt,
    emailVerified,
    needsGroup: !groupId,
  };
};

module.exports = { sanitizeUser };
