/**
 * Cart model — SCAFFOLD ONLY (commented out).
 *
 * Mirrors the shape used today in `db.json` (`db.carts[]`):
 *   { userId, items: [ { productId, title, image, subtitle, unitPrice,
 *                        quantity, stockAvailable? } ] }
 *
 * One cart per user is enforced via a unique index on `userId`. Items live
 * inline as a sub-array (Mongo handles 16 MB documents fine, more than
 * enough for a shopping cart). When we shard later we can promote items to
 * their own collection.
 */

// const mongoose = require("mongoose");

// const cartItemSchema = new mongoose.Schema(
//   {
//     productId: { type: String, required: true },
//     title: { type: String, default: "" },
//     image: { type: String, default: "" },
//     subtitle: { type: String, default: "" },
//     unitPrice: { type: Number, required: true, min: 0 },
//     quantity: { type: Number, required: true, min: 1, default: 1 },
//     stockAvailable: { type: Number, default: null },
//   },
//   { _id: false }
// );

// const cartSchema = new mongoose.Schema(
//   {
//     userId: { type: String, required: true, unique: true, index: true },
//     items: { type: [cartItemSchema], default: [] },
//   },
//   { timestamps: true }
// );

// cartSchema.set("toJSON", {
//   virtuals: true,
//   versionKey: false,
//   transform(_doc, ret) {
//     ret.id = String(ret._id);
//     delete ret._id;
//     return ret;
//   },
// });

// module.exports = mongoose.models.Cart || mongoose.model("Cart", cartSchema);

module.exports = null;
