const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    type: { type: String, enum: ["percent", "flat"], required: true },
    value: { type: Number, required: true, min: 0 },
    label: { type: String, default: "" },
    description: { type: String, default: "" },
    minOrder: { type: Number, default: 0, min: 0 },
    active: { type: Boolean, default: true },
    expiresAt: { type: String, default: null },
  },
  { strict: false, versionKey: false }
);

module.exports =
  mongoose.models.Coupon || mongoose.model("Coupon", couponSchema, "coupons");
