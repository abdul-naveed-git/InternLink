const admin = require("./firebaseAdminClient");
const { createHttpError } = require("./httpErrors");

const verifyFirebaseIdToken = async (idToken) => {
  if (!idToken) {
    throw createHttpError(
      400,
      "Firebase ID token is required.",
      "firebase_token_missing",
    );
  }

  try {
    const decoded = await admin.auth().verifyIdToken(idToken, true);

    if (!decoded.email) {
      throw createHttpError(
        400,
        "Firebase account has no email.",
        "firebase_email_missing",
      );
    }

    return {
      uid: decoded.uid,
      email: decoded.email.toLowerCase(),
      name: decoded.name || "",
      emailVerified: decoded.email_verified || false,
    };
  } catch (err) {
    console.error("[auth] Firebase verify failed:", {
      message: err.message,
      code: err.code,
    });

    throw createHttpError(
      401,
      "Invalid or expired Firebase ID token.",
      "firebase_token_invalid",
    );
  }
};

module.exports = {
  verifyFirebaseIdToken,
};
