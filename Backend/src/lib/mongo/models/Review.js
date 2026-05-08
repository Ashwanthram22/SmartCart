/**
 * Review model — SCAFFOLD ONLY (commented out).
 *
 * Mirrors the shape used today in `db.json` (`db.reviews[]`):
 *   { id, productId, userId, userName, rating, text, createdAt }
 *
 * Adding two indexes that aren't strictly used today but become valuable
 * the moment we move off the file db:
 *   - `(productId, createdAt desc)` for paginated "reviews for product X".
 *   - `(productId, userId)` unique to enforce "one review per user per
 *     product" once we want that rule.
 */

// const mongoose = require("mongoose");

// const reviewSchema = new mongoose.Schema(
//   {
//     legacyId: { type: String, index: true, unique: true, sparse: true },
//     productId: { type: String, required: true, index: true },
//     userId: { type: String, required: true, index: true },
//     userName: { type: String, required: true },
//     rating: { type: Number, required: true, min: 1, max: 5 },
//     text: { type: String, default: "", maxlength: 2000 },
//   },
//   { timestamps: true }
// );

// reviewSchema.index({ productId: 1, createdAt: -1 });
// reviewSchema.index({ productId: 1, userId: 1 }, { unique: true });

// reviewSchema.set("toJSON", {
//   virtuals: true,
//   versionKey: false,
//   transform(_doc, ret) {
//     ret.id = ret.legacyId || String(ret._id);
//     delete ret._id;
//     return ret;
//   },
// });

// module.exports = mongoose.models.Review || mongoose.model("Review", reviewSchema);

module.exports = null;
