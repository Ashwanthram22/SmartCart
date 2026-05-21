/**
 * Builds docs/collections/products/products.json — a JSON array ready to
 * paste/import into the MongoDB `products` collection (Compass or mongoimport).
 *
 * Run: node scripts/build-electronics-products.js
 */
const fs = require("fs");
const path = require("path");

const raw = [
  { id: "el1001", title: "Sony WH-1000XM5 Headphones", description: "Industry-leading wireless noise cancelling headphones with premium sound quality and all-day comfort.", category: "Electronics", brand: "Sony", catalogSegments: ["AI Picks", "Trending", "Electronics"], stock: 34, price: 29999, originalPrice: 34999, rating: 4.8, reviewCount: 5421, badge: "BESTSELLER", image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80", images: [" https://m.media-amazon.com/images/I/61vJtKbAssL._SY355_.jpg ", " https://m.media-amazon.com/images/I/81V1VCLb4oL._SX355_.jpg ", " https://m.media-amazon.com/images/I/81gW2Vb93RL._SY355_.jpg ", " https://m.media-amazon.com/images/I/81zk7HFkz7L._SY355_.jpg "], specs: { connectivity: "Bluetooth 5.2", batteryLife: "30 Hours", noiseCancellation: "Adaptive ANC" } },
  { id: "el1002", title: "JBL Flip 6 Speaker", description: "Portable Bluetooth speaker with deep bass and waterproof build.", category: "Electronics", brand: "JBL", catalogSegments: ["Trending", "Electronics"], stock: 51, price: 11999, originalPrice: 14999, rating: 4.7, reviewCount: 3210, badge: "HOT DEAL", image: "https://images.unsplash.com/photo-1589003077984-894e133dabab?auto=format&fit=crop&w=600&q=80", images: [" https://m.media-amazon.com/images/I/81nT721hWGL._SX522_.jpg ", " https://m.media-amazon.com/images/I/813IarPMYPL._SY355_.jpg ", " https://m.media-amazon.com/images/I/81EyO9sEpRL._SY355_.jpg ", " https://m.media-amazon.com/images/I/71BhictvX4L._SL1500_.jpg "], specs: { connectivity: "Bluetooth 5.1", batteryLife: "12 Hours", waterResistance: "IP67" } },
  { id: "el1003", title: "Apple AirPods Pro 2", description: "Wireless earbuds with spatial audio and active noise cancellation.", category: "Electronics", brand: "Apple", catalogSegments: ["AI Picks", "Electronics"], stock: 67, price: 24999, originalPrice: 27999, rating: 4.9, reviewCount: 8420, badge: "TOP RATED", image: " https://media-ik.croma.com/prod/https://media.tatacroma.com/301165_1_ctimht.png ", images: ["https://media-ik.croma.com/prod/https://media.tatacroma.com/301165_0_rmd0hf.png ", " https://media-ik.croma.com/prod/https://media.tatacroma.com/301165_2_zyywuk.png ", " https://media-ik.croma.com/prod/https://media.tatacroma.com/301165_3_tjlgzh.png ", " https://media-ik.croma.com/prod/https://media.tatacroma.com/301165_7_hrndbx.png "], specs: { chip: "Apple H2", batteryLife: "30 Hours", noiseCancellation: "Active ANC" } },
  { id: "el1004", title: "Samsung Crystal 4K UHD Smart TV", description: "Crystal clear 4K smart television with vivid HDR visuals.", category: "Electronics", brand: "Samsung", catalogSegments: ["Trending", "Electronics"], stock: 18, price: 54999, originalPrice: 62999, rating: 4.6, reviewCount: 2130, badge: "SMART PICK", image: "https://images.unsplash.com/photo-1593784991095-a205069470b6?auto=format&fit=crop&w=600&q=80", images: ["https://images.unsplash.com/photo-1593784991095-a205069470b6?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1461151304267-38535e780c79?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1511884642898-4c92249e20b6?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=1200&q=80"], specs: { display: "4K UHD", refreshRate: "120Hz", smartOS: "Tizen" } },
  { id: "el1005", title: "LG OLED Evo C4 TV", description: "Premium OLED television with ultra-smooth gaming and cinematic visuals.", category: "Electronics", brand: "LG", catalogSegments: ["AI Picks", "Electronics"], stock: 12, price: 129999, originalPrice: 144999, rating: 4.9, reviewCount: 1842, badge: "PREMIUM", image: "https://images.unsplash.com/photo-1577979749830-f1d742b96791?auto=format&fit=crop&w=600&q=80", images: ["https://images.unsplash.com/photo-1577979749830-f1d742b96791?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1601944177325-f8867652837f?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1587614382346-4ec70e388b28?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=1200&q=80"], specs: { panel: "OLED Evo", resolution: "4K", gaming: "144Hz VRR" } },
  { id: "el1006", title: "Canon EOS R50 Camera", description: "Compact mirrorless camera designed for creators and vloggers.", category: "Electronics", brand: "Canon", catalogSegments: ["Electronics"], stock: 21, price: 67999, originalPrice: 72999, rating: 4.8, reviewCount: 1390, badge: "CREATOR PICK", image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=600&q=80", images: ["https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1502920917128-1aa500764ce7?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1495707902641-75cac588d2e9?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1512790182412-b19e6d62bc39?auto=format&fit=crop&w=1200&q=80"], specs: { sensor: "24.2MP APS-C", video: "4K 30fps", autofocus: "Dual Pixel AF" } },
  { id: "el1007", title: "Sony Alpha A6700 Camera", description: "High-performance mirrorless camera with AI-powered autofocus.", category: "Electronics", brand: "Sony", catalogSegments: ["AI Picks", "Electronics"], stock: 15, price: 119999, originalPrice: 129999, rating: 4.9, reviewCount: 920, badge: "PRO CHOICE", image: "https://images.unsplash.com/photo-1516724562728-afc824a36e84?auto=format&fit=crop&w=600&q=80", images: ["https://images.unsplash.com/photo-1516724562728-afc824a36e84?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1510127034890-ba27508e9f1c?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1495121553079-4c61bcce1894?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1452780212940-6f5c0d14d848?auto=format&fit=crop&w=1200&q=80"], specs: { sensor: "26MP APS-C", processor: "BIONZ XR", video: "4K 120fps" } },
  { id: "el1008", title: "DJI Mini 4 Pro Drone", description: "Compact cinematic drone with 4K HDR video and intelligent flight modes.", category: "Electronics", brand: "DJI", catalogSegments: ["AI Picks", "Trending", "Electronics"], stock: 11, price: 89999, originalPrice: 95999, rating: 4.9, reviewCount: 1840, badge: "FLY HIGH", image: "https://images.unsplash.com/photo-1473968512647-3e447244af8f?auto=format&fit=crop&w=600&q=80", images: ["https://images.unsplash.com/photo-1473968512647-3e447244af8f?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1508614589041-895b88991e3e?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1521405924368-64c5b84bec60?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1506947411487-a56738267384?auto=format&fit=crop&w=1200&q=80"], specs: { camera: "4K HDR", flightTime: "34 Minutes", range: "20km" } },
  { id: "el1009", title: "Bose SoundLink Flex Speaker", description: "Portable Bluetooth speaker with rich audio and rugged waterproof design.", category: "Electronics", brand: "Bose", catalogSegments: ["Trending", "Electronics"], stock: 46, price: 14999, originalPrice: 17999, rating: 4.8, reviewCount: 2630, badge: "AUDIO PICK", image: "https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=600&q=80", images: ["https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1512446733611-9099a758e0e9?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1524678606370-a47ad25cb82a?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1589003077984-894e133dabab?auto=format&fit=crop&w=1200&q=80"], specs: { batteryLife: "12 Hours", waterResistance: "IP67", audio: "360° Sound" } },
  { id: "el1010", title: "GoPro Hero 13 Black", description: "Advanced action camera with ultra-smooth stabilization and 5.3K recording.", category: "Electronics", brand: "GoPro", catalogSegments: ["AI Picks", "Electronics"], stock: 24, price: 42999, originalPrice: 47999, rating: 4.8, reviewCount: 4120, badge: "ACTION READY", image: "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=600&q=80", images: ["https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1495707902641-75cac588d2e9?auto=format&fit=crop&w=1200&q=80"], specs: { video: "5.3K Recording", stabilization: "HyperSmooth", waterproof: "10m" } },
  { id: "el1011", title: "Apple Watch Ultra 2", description: "Rugged premium smartwatch built for adventure, fitness, and connectivity.", category: "Electronics", brand: "Apple", catalogSegments: ["Trending", "Electronics"], stock: 37, price: 84999, originalPrice: 89999, rating: 4.9, reviewCount: 5210, badge: "ULTRA PERFORMANCE", image: "https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?auto=format&fit=crop&w=600&q=80", images: ["https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1516574187841-cb9cc2ca948b?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?auto=format&fit=crop&w=1200&q=80"], specs: { display: "Always-On Retina", batteryLife: "36 Hours", waterResistance: "100m" } },
  { id: "el1012", title: "Meta Quest 3 VR Headset", description: "Mixed reality headset delivering immersive gaming and virtual experiences.", category: "Electronics", brand: "Meta", catalogSegments: ["AI Picks", "Trending", "Electronics"], stock: 19, price: 54999, originalPrice: 59999, rating: 4.7, reviewCount: 2980, badge: "VR EXPERIENCE", image: "https://images.unsplash.com/photo-1622979135225-d2ba269cf1ac?auto=format&fit=crop&w=600&q=80", images: ["https://images.unsplash.com/photo-1622979135225-d2ba269cf1ac?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1593508512255-86ab42a8e620?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1626379953822-baec19c3accd?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1617802690992-15d93263d3a9?auto=format&fit=crop&w=1200&q=80"], specs: { storage: "512GB", display: "4K+ Infinite Display", tracking: "Inside-Out" } },
  { id: "el1013", title: "Anker 737 Power Bank", description: "High-capacity fast charging power bank with smart digital display.", category: "Electronics", brand: "Anker", catalogSegments: ["Electronics"], stock: 73, price: 13999, originalPrice: 15999, rating: 4.8, reviewCount: 1760, badge: "FAST CHARGE", image: "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?auto=format&fit=crop&w=600&q=80", images: ["https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1585338107529-13afc5f02586?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1615526675159-e248c3021d3f?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=1200&q=80"], specs: { capacity: "24000mAh", output: "140W", ports: "USB-C + USB-A" } },
  { id: "el1014", title: "Logitech StreamCam", description: "Professional streaming webcam optimized for creators and live streaming.", category: "Electronics", brand: "Logitech", catalogSegments: ["Trending", "Electronics"], stock: 28, price: 16999, originalPrice: 19999, rating: 4.6, reviewCount: 980, badge: "STREAM READY", image: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=600&q=80", images: ["https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1495707902641-75cac588d2e9?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1512790182412-b19e6d62bc39?auto=format&fit=crop&w=1200&q=80"], specs: { resolution: "1080p 60fps", microphone: "Dual Front-Facing", connectivity: "USB-C" } },
  { id: "el1015", title: "Amazon Echo Show 10", description: "Smart display with Alexa voice assistant and rotating HD screen.", category: "Electronics", brand: "Amazon", catalogSegments: ["AI Picks", "Electronics"], stock: 31, price: 24999, originalPrice: 28999, rating: 4.7, reviewCount: 3540, badge: "SMART HOME", image: "https://images.unsplash.com/photo-1512446816042-444d64126727?auto=format&fit=crop&w=600&q=80", images: ["https://images.unsplash.com/photo-1512446816042-444d64126727?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1527443154391-507e9dc6c5cc?auto=format&fit=crop&w=1200&q=80"], specs: { assistant: "Alexa", display: "10.1-inch HD", camera: "13MP Auto-Framing" } },
];

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

  return {
    id: p.id,
    title: p.title,
    description: p.description || "",
    category: p.category,
    brand: p.brand || "",
    catalogSegments: Array.isArray(p.catalogSegments) ? p.catalogSegments : ["Electronics"],
    stock: Number(p.stock) || 0,
    price: Number(p.price) || 0,
    originalPrice:
      p.originalPrice == null || p.originalPrice === ""
        ? null
        : Number(p.originalPrice),
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
    createdAt: "2026-05-01T08:00:00.000Z",
    updatedAt: "2026-05-21T10:30:00.000Z",
    createdBy: "admin@aicart.com",
    updatedBy: "admin@aicart.com",
  };
}

const ids = raw.map((item) => item.id);
const products = raw.map((p, i) =>
  buildMongoProduct(p, [ids[(i + 1) % ids.length], ids[(i + 2) % ids.length]])
);

for (const doc of products) {
  for (const key of REQUIRED_KEYS) {
    if (!(key in doc)) {
      throw new Error(`Missing ${key} on product ${doc.id}`);
    }
  }
  if (Object.keys(doc.specs).length < 3) {
    throw new Error(`Product ${doc.id} must have 3 specs`);
  }
  if (doc.similarProductIds.length !== 2) {
    throw new Error(`Product ${doc.id} must have 2 similarProductIds`);
  }
}

const outPath = path.join(__dirname, "..", "docs", "collections", "products", "products.json");
fs.writeFileSync(outPath, `${JSON.stringify(products, null, 2)}\n`);
console.log(`Wrote ${products.length} Mongo-ready documents to ${outPath}`);
