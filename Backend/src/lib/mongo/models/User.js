/**
 * User model — SCAFFOLD ONLY (commented out).
 *
 * Mirrors the shape used today in `db.json`:
 *   { id, name, email, password, role, provider? }
 *
 * Notes for the cutover:
 *   - We keep a `legacyId` field so existing string IDs like "u1" / "u17775..."
 *     can be preserved during migration. Mongo's _id stays the new canonical
 *     primary key, but `legacyId` lets old foreign keys (cart.userId, etc.)
 *     continue resolving until you backfill them.
 *   - `password` stays bcrypt-hashed. Use the same `lib/passwords.js` helpers.
 *   - `email` is unique + lowercased.
 */

// const mongoose = require("mongoose");

// const userSchema = new mongoose.Schema(
//   {
//     legacyId: { type: String, index: true, unique: true, sparse: true },
//     name: { type: String, required: true, trim: true },
//     email: {
//       type: String,
//       required: true,
//       unique: true,
//       lowercase: true,
//       trim: true,
//     },
//     password: { type: String, default: null }, // null for OAuth-only users
//     role: { type: String, enum: ["customer", "admin"], default: "customer" },
//     provider: { type: String, default: null }, // e.g. "google"
//   },
//   { timestamps: true }
// );

// userSchema.set("toJSON", {
//   virtuals: true,
//   versionKey: false,
//   transform(_doc, ret) {
//     ret.id = ret.legacyId || String(ret._id);
//     delete ret._id;
//     delete ret.password;
//     return ret;
//   },
// });

// module.exports = mongoose.models.User || mongoose.model("User", userSchema);

module.exports = null;
