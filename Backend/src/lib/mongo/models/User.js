/**
 * User model — SCAFFOLD ONLY (commented out).
 *
 * Auth fields plus embedded per-user profile (cart, saved list, prefs,
 * addresses, alerts). Orders stay in a separate `orders` collection.
 *
 * Notes for the cutover:
 *   - `legacyId` preserves string IDs like "u1" during migration.
 *   - `password` stays bcrypt-hashed via `lib/passwords.js`.
 *   - `email` is unique + lowercased.
 */

// const mongoose = require("mongoose");

// const cartLineSchema = new mongoose.Schema(
//   {
//     productId: { type: String, required: true },
//     quantity: { type: Number, default: 1, min: 1 },
//   },
//   { _id: false }
// );

// const savedItemSchema = new mongoose.Schema(
//   {
//     id: { type: String, required: true },
//     title: String,
//     subtitle: String,
//     image: String,
//     category: String,
//     price: Number,
//     rating: Number,
//     stock: Number,
//     savedAt: String,
//   },
//   { _id: false }
// );

// const addressSchema = new mongoose.Schema(
//   {
//     id: { type: String, required: true },
//     fullName: String,
//     line1: String,
//     line2: String,
//     city: String,
//     postal: String,
//     label: String,
//     phone: String,
//     isDefault: Boolean,
//     createdAt: String,
//     updatedAt: String,
//   },
//   { _id: false }
// );

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
//     password: { type: String, default: null },
//     role: { type: String, enum: ["customer", "admin"], default: "customer" },
//     provider: { type: String, default: null },
//     cart: {
//       items: { type: [cartLineSchema], default: [] },
//       updatedAt: { type: Date, default: Date.now },
//     },
//     savedItems: {
//       items: { type: [savedItemSchema], default: [] },
//       updatedAt: { type: Date, default: Date.now },
//     },
//     preferences: { type: mongoose.Schema.Types.Mixed, default: {} },
//     addresses: { type: [addressSchema], default: [] },
//     stockAlerts: { type: [mongoose.Schema.Types.Mixed], default: [] },
//     priceAlerts: { type: [mongoose.Schema.Types.Mixed], default: [] },
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
