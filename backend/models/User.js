const mongoose = require("mongoose");
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true },
    role: {
      type: String,
      enum: ["student", "teacher", "admin"],
      default: "student",
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      default: null,
    },
    refreshToken: { type: String, default: null },
    emailVerified: { type: Boolean, default: true },
    firebaseUid: { type: String, unique: true },
  },
  { timestamps: true },
);
userSchema.index({ email: 1 }, { unique: true });
module.exports = mongoose.model("User", userSchema);
