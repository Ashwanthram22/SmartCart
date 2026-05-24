const mongoose = require("mongoose");

const cartLineSchema = new mongoose.Schema(
  {
    productId: { type: String, required: true },
    quantity: { type: Number, default: 1, min: 1 },
  },
  { _id: false }
);

const savedStoredSchema = new mongoose.Schema(
  {
    productId: { type: String, required: true },
    savedAt: { type: String, default: null },
  },
  { _id: false }
);

const addressSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    fullName: String,
    line1: String,
    line2: String,
    city: String,
    postal: String,
    label: String,
    phone: String,
    isDefault: Boolean,
    createdAt: String,
    updatedAt: String,
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, default: null },
    role: { type: String, enum: ["customer", "admin"], default: "customer" },
    isAdmin: { type: Boolean, default: false },
    provider: { type: String, default: null },
    cart: {
      items: { type: [cartLineSchema], default: [] },
      updatedAt: { type: String, default: null },
    },
    savedItems: {
      items: { type: [savedStoredSchema], default: [] },
      updatedAt: { type: String, default: null },
    },
    preferences: { type: mongoose.Schema.Types.Mixed, default: {} },
    addresses: { type: [addressSchema], default: [] },
    stockAlerts: { type: [mongoose.Schema.Types.Mixed], default: [] },
    priceAlerts: { type: [mongoose.Schema.Types.Mixed], default: [] },
  },
  { strict: false, versionKey: false }
);

module.exports = mongoose.models.User || mongoose.model("User", userSchema, "users");
