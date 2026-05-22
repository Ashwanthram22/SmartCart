/**
 * Build docs/collections/orders/orders.json from products + seed users.
 *
 * Usage: node scripts/generate-orders-seed.js
 */
const fs = require("fs");
const path = require("path");

const TAX_RATE = 0.08;

const COUPONS = {
  WELCOME10: {
    code: "WELCOME10",
    type: "percent",
    value: 10,
    label: "10% off your first order",
    description: "Save 10% on any order — no minimum.",
    minOrder: 0,
  },
  SAVE25: {
    code: "SAVE25",
    type: "flat",
    value: 2000,
    label: "₹2,000 off orders over ₹16,000",
    description: "Take ₹2,000 off when your subtotal is at least ₹16,000.",
    minOrder: 16000,
  },
  AICART: {
    code: "AICART",
    type: "percent",
    value: 15,
    label: "15% off — AI-curated picks",
    description: "Use code AICART for 15% off any order over ₹4,000.",
    minOrder: 4000,
  },
};

const USERS = {
  "u-seed-01": {
    name: "Priya Sharma",
    address: {
      fullName: "Priya Sharma",
      line1: "12 MG Road, Koramangala",
      city: "Bengaluru",
      postal: "560034",
    },
  },
  "u-seed-02": {
    name: "Rahul Mehta",
    address: {
      fullName: "Rahul Mehta",
      line1: "88 Linking Road, Bandra",
      city: "Mumbai",
      postal: "400050",
    },
  },
  "u-seed-03": {
    name: "Ananya Iyer",
    address: {
      fullName: "Ananya Iyer",
      line1: "5 Cathedral Road",
      city: "Chennai",
      postal: "600086",
    },
  },
  "u-seed-04": {
    name: "Vikram Singh",
    address: {
      fullName: "Vikram Singh",
      line1: "22 Connaught Place",
      city: "New Delhi",
      postal: "110001",
    },
  },
  "u-seed-05": {
    name: "Sneha Kapoor",
    address: {
      fullName: "Sneha Kapoor",
      line1: "14 FC Road",
      city: "Pune",
      postal: "411004",
    },
  },
};

/** @type {{ id: string; userId: keyof USERS; lines: { productId: string; qty: number }[]; coupon?: keyof COUPONS; status: string; createdAt: string; updatedAt?: string }[]} */
const SPECS = [
  {
    id: "o-seed-priya-001",
    userId: "u-seed-01",
    lines: [{ productId: "el1001", qty: 1 }],
    coupon: "WELCOME10",
    status: "processing",
    createdAt: "2026-04-01T10:00:00.000Z",
  },
  {
    id: "o-seed-rahul-001",
    userId: "u-seed-02",
    lines: [{ productId: "el1001", qty: 1 }],
    status: "processing",
    createdAt: "2026-04-15T14:30:00.000Z",
  },
  {
    id: "o-seed-priya-002",
    userId: "u-seed-01",
    lines: [
      { productId: "el1003", qty: 1 },
      { productId: "fa1001", qty: 1 },
    ],
    coupon: "AICART",
    status: "processing",
    createdAt: "2026-05-05T09:15:00.000Z",
  },
  {
    id: "o-seed-ananya-001",
    userId: "u-seed-03",
    lines: [{ productId: "mb1001", qty: 1 }],
    status: "processing",
    createdAt: "2026-05-10T11:00:00.000Z",
  },
  {
    id: "o-seed-vikram-001",
    userId: "u-seed-04",
    lines: [{ productId: "lp1001", qty: 1 }],
    coupon: "SAVE25",
    status: "processing",
    createdAt: "2026-03-20T16:45:00.000Z",
  },
  {
    id: "o-seed-sneha-001",
    userId: "u-seed-05",
    lines: [
      { productId: "hk1001", qty: 1 },
      { productId: "gr1001", qty: 2 },
    ],
    coupon: "WELCOME10",
    status: "cancelled",
    createdAt: "2026-05-12T08:20:00.000Z",
    updatedAt: "2026-05-12T18:00:00.000Z",
  },
  {
    id: "o-seed-rahul-002",
    userId: "u-seed-02",
    lines: [{ productId: "mb1002", qty: 1 }],
    coupon: "AICART",
    status: "processing",
    createdAt: "2026-05-08T13:00:00.000Z",
  },
  {
    id: "o-seed-ananya-002",
    userId: "u-seed-03",
    lines: [{ productId: "el1001", qty: 1 }],
    coupon: "WELCOME10",
    status: "processing",
    createdAt: "2026-05-01T07:30:00.000Z",
  },
  {
    id: "o-seed-vikram-002",
    userId: "u-seed-04",
    lines: [
      { productId: "fa1001", qty: 1 },
      { productId: "hk1001", qty: 1 },
    ],
    status: "processing",
    createdAt: "2026-04-25T12:00:00.000Z",
  },
  {
    id: "o-seed-sneha-002",
    userId: "u-seed-05",
    lines: [{ productId: "el1002", qty: 1 }],
    status: "processing",
    createdAt: "2026-05-15T10:00:00.000Z",
  },
  {
    id: "o-seed-priya-003",
    userId: "u-seed-01",
    lines: [{ productId: "gr1001", qty: 3 }],
    status: "cancelled",
    createdAt: "2026-03-28T09:00:00.000Z",
    updatedAt: "2026-03-29T11:00:00.000Z",
  },
  {
    id: "o-seed-rahul-003",
    userId: "u-seed-02",
    lines: [
      { productId: "el1001", qty: 1 },
      { productId: "el1003", qty: 1 },
    ],
    coupon: "SAVE25",
    status: "processing",
    createdAt: "2026-05-18T17:00:00.000Z",
  },
];

function discountFor(couponKey, subtotal) {
  const c = COUPONS[couponKey];
  if (!c || subtotal < c.minOrder) return 0;
  if (c.type === "percent") {
    const pct = Math.max(0, Math.min(100, c.value));
    return Number(((subtotal * pct) / 100).toFixed(2));
  }
  return Number(Math.min(subtotal, c.value).toFixed(2));
}

function priceLine(product, qty) {
  const unitPrice = Number(product.price);
  const quantity = Math.max(1, qty);
  const rating = product.rating;
  const ratingLabel =
    rating != null && Number.isFinite(Number(rating)) ? `${rating}★` : "—★";
  return {
    productId: String(product.id),
    title: product.title,
    image: product.image || "",
    subtitle: `${product.category} • ${ratingLabel} rated`,
    unitPrice: Number(unitPrice.toFixed(2)),
    quantity,
    lineTotal: Number((unitPrice * quantity).toFixed(2)),
  };
}

function summarise(subtotal, discountAmount) {
  const discount = Math.max(0, Math.min(subtotal, Number(discountAmount) || 0));
  const taxable = Math.max(0, subtotal - discount);
  const tax = Number((taxable * TAX_RATE).toFixed(2));
  const total = Number((taxable + tax).toFixed(2));
  return {
    subtotal: Number(subtotal.toFixed(2)),
    discount: Number(discount.toFixed(2)),
    tax,
    total,
  };
}

function buildOrder(spec, productById) {
  const user = USERS[spec.userId];
  const items = spec.lines.map(({ productId, qty }) => {
    const p = productById.get(productId);
    if (!p) throw new Error(`Missing product ${productId}`);
    return priceLine(p, qty);
  });
  const subtotal = items.reduce((s, l) => s + l.lineTotal, 0);
  const discountAmt = spec.coupon ? discountFor(spec.coupon, subtotal) : 0;
  const totals = summarise(subtotal, discountAmt);
  const updatedAt = spec.updatedAt || spec.createdAt;
  const order = {
    id: spec.id,
    userId: spec.userId,
    items,
    ...totals,
    address: { ...user.address },
    status: spec.status,
    createdAt: spec.createdAt,
    updatedAt,
  };
  if (spec.coupon) order.coupon = { ...COUPONS[spec.coupon] };
  if (spec.status === "cancelled") order.cancelledAt = updatedAt;
  return order;
}

function main() {
  const productsPath = path.join(
    __dirname,
    "../docs/collections/products/products.json"
  );
  const outPath = path.join(
    __dirname,
    "../docs/collections/orders/orders.json"
  );
  const products = JSON.parse(fs.readFileSync(productsPath, "utf8"));
  const productById = new Map(products.map((p) => [p.id, p]));
  const orders = SPECS.map((s) => buildOrder(s, productById));
  fs.writeFileSync(outPath, `${JSON.stringify(orders, null, 2)}\n`, "utf8");
  console.log(`Wrote ${orders.length} orders → ${outPath}`);
}

main();
