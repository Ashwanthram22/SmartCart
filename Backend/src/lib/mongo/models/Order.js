const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    productId: { type: String, required: true },
    title: { type: String, default: "" },
    image: { type: String, default: "" },
    subtitle: { type: String, default: "" },
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const orderAddressSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    line1: { type: String, required: true },
    city: { type: String, required: true },
    postal: { type: String, required: true },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    items: { type: [orderItemSchema], default: [] },
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    tax: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    coupon: { type: mongoose.Schema.Types.Mixed, default: null },
    address: { type: orderAddressSchema, required: true },
    status: {
      type: String,
      enum: ["processing", "transit", "delivered", "cancelled"],
      default: "processing",
      index: true,
    },
    createdAt: { type: String, default: null },
    updatedAt: { type: String, default: null },
    cancelledAt: { type: String, default: null },
    deliveredAt: { type: String, default: null },
  },
  { strict: false, versionKey: false }
);

orderSchema.index({ userId: 1, createdAt: -1 });

module.exports =
  mongoose.models.Order || mongoose.model("Order", orderSchema, "orders");
