/**
 * Product model — SCAFFOLD ONLY (commented out).
 *
 * Mirrors the shape used today in `db.json`:
 *   {
 *     id, title, category, brand, catalogSegments[], stock, price,
 *     originalPrice?, rating, reviewCount, badge?, image, specs?
 *   }
 *
 * `specs` is stored as a free-form sub-document so each category can supply
 * its own keys (display, processor, battery, …) without a schema migration
 * every time a new attribute is introduced.
 */

// const mongoose = require("mongoose");

// const productSchema = new mongoose.Schema(
//   {
//     legacyId: { type: String, index: true, unique: true, sparse: true },
//     title: { type: String, required: true, trim: true },
//     category: { type: String, default: "" },
//     brand: { type: String, default: "" },
//     catalogSegments: { type: [String], default: [] },
//     stock: { type: Number, default: 0, min: 0 },
//     price: { type: Number, required: true, min: 0 },
//     originalPrice: { type: Number, default: null },
//     rating: { type: Number, default: 0, min: 0, max: 5 },
//     reviewCount: { type: Number, default: 0, min: 0 },
//     badge: { type: String, default: null },
//     image: { type: String, default: "" },
//     specs: { type: mongoose.Schema.Types.Mixed, default: {} },
//   },
//   { timestamps: true }
// );

// productSchema.index({ catalogSegments: 1 });
// productSchema.index({ brand: 1 });
// productSchema.index({ title: "text", category: "text", brand: "text" });

// productSchema.set("toJSON", {
//   virtuals: true,
//   versionKey: false,
//   transform(_doc, ret) {
//     ret.id = ret.legacyId || String(ret._id);
//     delete ret._id;
//     return ret;
//   },
// });

// module.exports = mongoose.models.Product || mongoose.model("Product", productSchema);

module.exports = null;
