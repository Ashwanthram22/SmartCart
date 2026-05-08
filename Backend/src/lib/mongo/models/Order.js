/**
 * Order model — SCAFFOLD ONLY (commented out).
 *
 * Mirrors the shape used today in `db.json` (`db.orders[]`):
 *   {
 *     id, userId, items: [...priced cart lines], subtotal, tax, total,
 *     address: { fullName, line1, city, postal },
 *     status, createdAt, updatedAt
 *   }
 *
 * `status` is now an enum that includes `cancelled` so the new cancel
 * endpoint can transition properly. The existing rule-based progression
 * (processing → transit → delivered by age) keeps working as long as a
 * stored status of `processing` is present.
 */

// const mongoose = require("mongoose");

// const orderItemSchema = new mongoose.Schema(
//   {
//     productId: { type: String, required: true },
//     title: { type: String, default: "" },
//     image: { type: String, default: "" },
//     subtitle: { type: String, default: "" },
//     unitPrice: { type: Number, required: true, min: 0 },
//     quantity: { type: Number, required: true, min: 1 },
//     lineTotal: { type: Number, required: true, min: 0 },
//   },
//   { _id: false }
// );

// const orderAddressSchema = new mongoose.Schema(
//   {
//     fullName: { type: String, required: true },
//     line1: { type: String, required: true },
//     city: { type: String, required: true },
//     postal: { type: String, required: true },
//   },
//   { _id: false }
// );

// const orderSchema = new mongoose.Schema(
//   {
//     legacyId: { type: String, index: true, unique: true, sparse: true },
//     userId: { type: String, required: true, index: true },
//     items: { type: [orderItemSchema], default: [] },
//     subtotal: { type: Number, required: true, min: 0 },
//     tax: { type: Number, required: true, min: 0 },
//     total: { type: Number, required: true, min: 0 },
//     address: { type: orderAddressSchema, required: true },
//     status: {
//       type: String,
//       enum: ["processing", "transit", "delivered", "cancelled"],
//       default: "processing",
//       index: true,
//     },
//   },
//   { timestamps: true }
// );

// orderSchema.index({ userId: 1, createdAt: -1 });

// orderSchema.set("toJSON", {
//   virtuals: true,
//   versionKey: false,
//   transform(_doc, ret) {
//     ret.id = ret.legacyId || String(ret._id);
//     delete ret._id;
//     return ret;
//   },
// });

// module.exports = mongoose.models.Order || mongoose.model("Order", orderSchema);

module.exports = null;
