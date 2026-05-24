const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    productId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    userName: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    text: { type: String, default: "", maxlength: 2000 },
    createdAt: { type: String, default: null },
  },
  { strict: false, versionKey: false }
);

reviewSchema.index({ productId: 1, createdAt: -1 });

module.exports =
  mongoose.models.Review || mongoose.model("Review", reviewSchema, "reviews");
