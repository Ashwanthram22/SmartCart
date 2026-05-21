const SPEC_LABELS = {
  connectivity: "Connectivity",
  batteryLife: "Battery",
  noiseCancellation: "Noise Cancelling",
  chip: "Chip",
  waterResistance: "Water Resistance",
  display: "Display",
  refreshRate: "Refresh Rate",
  smartOS: "Smart OS",
  panel: "Panel",
  resolution: "Resolution",
  gaming: "Gaming",
  sensor: "Sensor",
  video: "Video",
  autofocus: "Autofocus",
  processor: "Processor",
  camera: "Camera",
  flightTime: "Flight Time",
  range: "Range",
  audio: "Audio",
  stabilization: "Stabilization",
  waterproof: "Waterproof",
  storage: "Storage",
  tracking: "Tracking",
  capacity: "Capacity",
  output: "Output",
  ports: "Ports",
  microphone: "Microphone",
  assistant: "Voice Assistant",
  battery: "Battery",
  charging: "Charging",
  os: "Operating System",
  ram: "Memory",
  weight: "Weight",
  cooling: "Cooling",
};

const REQUIRED_KEYS = [
  "id",
  "title",
  "description",
  "category",
  "brand",
  "catalogSegments",
  "stock",
  "price",
  "originalPrice",
  "discountPercent",
  "rating",
  "reviewCount",
  "badge",
  "image",
  "images",
  "specs",
  "similarProductIds",
  "warranty",
  "returns",
  "createdAt",
  "updatedAt",
  "createdBy",
  "updatedBy",
];

function prettyKey(k) {
  return SPEC_LABELS[k] || k;
}

function trimUrl(u) {
  return String(u || "").trim();
}

function discountPercent(price, originalPrice) {
  const p = Number(price);
  const o = Number(originalPrice);
  if (!Number.isFinite(p) || !Number.isFinite(o) || o <= p || o <= 0) return null;
  return Math.round(((o - p) / o) * 100);
}

function buildMongoProduct(p, similarProductIds) {
  const specs = {};
  for (const [k, v] of Object.entries(p.specs || {})) {
    specs[prettyKey(k)] = String(v).trim();
  }
  const image = trimUrl(p.image);
  const images = (p.images || []).map(trimUrl).filter(Boolean);
  const primaryImage = image || images[0] || "";
  const segmentByCategory = {
    Mobiles: ["Mobiles"],
    Electronics: ["Electronics"],
    Laptops: ["Laptops"],
    Accessories: ["Accessories"],
    Fashion: ["Fashion"],
    "Home & Kitchen": ["Home & Kitchen"],
    Sports: ["Sports"],
    Books: ["Books"],
    Groceries: ["Groceries"],
  };
  const defaultSegments = segmentByCategory[p.category] || ["AI Picks"];

  return {
    id: p.id,
    title: p.title,
    description: p.description || "",
    category: p.category,
    brand: p.brand || "",
    catalogSegments: Array.isArray(p.catalogSegments) ? p.catalogSegments : defaultSegments,
    stock: Number(p.stock) || 0,
    price: Number(p.price) || 0,
    originalPrice:
      p.originalPrice == null || p.originalPrice === "" ? null : Number(p.originalPrice),
    discountPercent: discountPercent(p.price, p.originalPrice),
    rating: Number(p.rating) || 0,
    reviewCount: Number(p.reviewCount) || 0,
    badge: p.badge || null,
    image: primaryImage,
    images: images.length ? images : primaryImage ? [primaryImage] : [],
    specs,
    similarProductIds,
    warranty: { label: "2YR WARRANTY" },
    returns: { label: "30-DAY RETURNS" },
    createdAt: p.createdAt || "2026-05-01T08:00:00.000Z",
    updatedAt: p.updatedAt || "2026-05-21T10:30:00.000Z",
    createdBy: "admin@aicart.com",
    updatedBy: "admin@aicart.com",
  };
}

function buildCategoryBatch(raw) {
  const ids = raw.map((item) => item.id);
  const products = raw.map((p, i) =>
    buildMongoProduct(p, [ids[(i + 1) % ids.length], ids[(i + 2) % ids.length]])
  );

  for (const doc of products) {
    for (const key of REQUIRED_KEYS) {
      if (!(key in doc)) throw new Error(`Missing ${key} on product ${doc.id}`);
    }
    if (Object.keys(doc.specs).length < 3) {
      throw new Error(`Product ${doc.id} must have 3 specs`);
    }
    if (doc.similarProductIds.length !== 2) {
      throw new Error(`Product ${doc.id} must have 2 similarProductIds`);
    }
  }

  return products;
}

module.exports = { buildCategoryBatch, REQUIRED_KEYS };
