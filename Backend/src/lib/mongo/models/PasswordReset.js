const mongoose = require("mongoose");

const passwordResetSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    tokenHash: { type: String, required: true, index: true },
    createdAt: { type: String, default: null },
    expiresAt: { type: Number, required: true },
    usedAt: { type: String, default: null },
  },
  { strict: false, versionKey: false }
);

module.exports =
  mongoose.models.PasswordReset ||
  mongoose.model("PasswordReset", passwordResetSchema, "passwordResets");
