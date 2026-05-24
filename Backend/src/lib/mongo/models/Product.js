const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    category: { type: String, default: "" },
    brand: { type: String, default: "" },
    catalogSegments: { type: [String], default: [] },
    stock: { type: Number, default: 0, min: 0 },
    price: { type: Number, required: true, min: 0 },
    originalPrice: { type: Number, default: null },
    discountPercent: { type: Number, default: null },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0, min: 0 },
    badge: { type: String, default: null },
    image: { type: String, default: "" },
    images: { type: [String], default: [] },
    specs: { type: mongoose.Schema.Types.Mixed, default: {} },
    similarProductIds: { type: [String], default: [] },
    warranty: { type: mongoose.Schema.Types.Mixed, default: null },
    returns: { type: mongoose.Schema.Types.Mixed, default: null },
    createdAt: { type: String, default: null },
    updatedAt: { type: String, default: null },
    createdBy: { type: String, default: null },
    updatedBy: { type: String, default: null },
  },
  { strict: false, versionKey: false }
);

productSchema.index({ catalogSegments: 1 });
productSchema.index({ brand: 1 });
productSchema.index({ category: 1 });

module.exports =
  mongoose.models.Product || mongoose.model("Product", productSchema, "products");
