/**
 * Category-aware default product specs.
 *
 * Used as a fall-through on the product detail page so every SKU shows a
 * believable spec table even when `db.json` only has one or two real fields
 * (or none at all). Real per-product specs from the API always take
 * precedence — defaults only fill in keys that aren't already present.
 *
 * Shape: `productSpecsFor(product)` returns an array of `[label, value]`
 * tuples ready for rendering. Uses `product.category` to pick the table
 * and merges in any `product.specs` object the backend supplied.
 *
 * Adding a new category? Add a new `CATEGORY_DEFAULTS` entry below.
 */

const SPEC_LABELS = {
  display: "Display",
  processor: "Processor",
  graphics: "Graphics",
  battery: "Battery",
  weight: "Weight",
  ports: "Ports",
  storage: "Storage",
  ram: "Memory",
  camera: "Camera",
  os: "Operating System",
  connectivity: "Connectivity",
  waterResistance: "Water Resistance",
  driver: "Driver",
  noiseCancelling: "Noise Cancelling",
  micRange: "Mic Range",
  drivers: "Driver Size",
  bluetooth: "Bluetooth",
  charging: "Charging Case",
  sensors: "Sensors",
  strap: "Strap",
  pages: "Pages",
  language: "Language",
  publisher: "Publisher",
  isbn: "ISBN",
  servings: "Servings",
  contents: "Contents",
  storageLife: "Shelf Life",
  ingredients: "Key Ingredients",
  bulb: "Bulb Type",
  brightness: "Brightness",
  smartHub: "Smart Hub",
  voiceControl: "Voice Control",
  filter: "Filter",
  coverage: "Room Coverage",
  noiseLevel: "Noise Level",
  modes: "Modes",
  sole: "Sole",
  upper: "Upper",
  closure: "Closure",
  fit: "Fit",
  thermostat: "Thermostat Range",
  protocol: "Protocol",
  rangeKm: "Range",
  flightTime: "Flight Time",
  videoResolution: "Video",
  gimbal: "Gimbal",
  growArea: "Grow Area",
  pods: "Plant Pods",
  control: "Control",
};

const CATEGORY_DEFAULTS = {
  Wearables: {
    display: "1.4-inch AMOLED, 480x480",
    sensors: "Heart-rate, SpO2, GPS, Gyro",
    battery: "14 days typical use",
    waterResistance: "5ATM (50m)",
    strap: "Sport silicone, quick-release",
    connectivity: "Bluetooth 5.3, NFC pay",
  },
  Fitness: {
    display: "0.96-inch OLED",
    sensors: "Heart-rate, Step, Sleep",
    battery: "10 days typical",
    waterResistance: "IP68",
    connectivity: "Bluetooth 5.0",
  },
  Audio: {
    drivers: "11mm dynamic, dual-magnet",
    noiseCancelling: "Active ANC, –35 dB",
    bluetooth: "Bluetooth 5.3, multi-point",
    battery: "Up to 8 h (32 h with case)",
    charging: "USB-C and Qi wireless",
    waterResistance: "IPX5",
  },
  Tablets: {
    display: '12.9" Liquid Retina XDR, 120 Hz',
    processor: "Apple M3, 8-core CPU",
    storage: "256 GB / 512 GB / 1 TB",
    ram: "8 GB unified memory",
    battery: "10-hour video playback",
    connectivity: "Wi-Fi 6E, Bluetooth 5.3",
    weight: "682 g",
  },
  Computing: {
    display: '12" Retina, 120 Hz',
    processor: "Apple M3, 8-core CPU",
    ram: "16 GB unified memory",
    storage: "512 GB SSD",
    battery: "11-hour mixed use",
    weight: "640 g",
    ports: "USB-C, Thunderbolt 4",
  },
  Mobiles: {
    display: '6.7" AMOLED, 120 Hz',
    processor: "Snapdragon X Elite",
    ram: "12 GB LPDDR5X",
    storage: "256 GB UFS 4.0",
    camera: "50 MP triple, OIS",
    battery: "5,000 mAh, 65 W charging",
    os: "Android 15",
  },
  Drones: {
    flightTime: "34 min per battery",
    rangeKm: "10 km HD video link",
    videoResolution: "4K @ 60 fps, HDR",
    gimbal: "3-axis stabilised",
    weight: "595 g",
    sensors: "Obstacle avoidance (omnidirectional)",
  },
  Home: {
    bulb: "LED, 9W (60W equivalent)",
    brightness: "806 lumens",
    smartHub: "Wi-Fi, Matter, Thread",
    voiceControl: "Alexa, Google, Siri",
    modes: "16M colours + Adaptive White",
    coverage: "Single-room",
  },
  "Smart Home": {
    smartHub: "Built-in Matter + Thread border router",
    protocol: "Wi-Fi 6, Zigbee, BLE",
    voiceControl: "Alexa, Google Assistant",
    sensors: "Temperature, humidity, motion",
    coverage: "Whole-home, up to 200 devices",
    thermostat: "10 – 32 °C",
  },
  Wellness: {
    filter: "True HEPA H13 + Carbon",
    coverage: "Up to 50 m² (540 sq ft)",
    noiseLevel: "24 dB sleep mode",
    modes: "Auto, Sleep, Turbo, Pollen",
    sensors: "PM2.5, VOC, Humidity",
    connectivity: "Wi-Fi, app + voice",
  },
  Sports: {
    sole: "Carbon-plate cushioned",
    upper: "Engineered breathable mesh",
    closure: "Quick-lace + heel pull",
    fit: "True to size, neutral pronation",
    weight: "232 g (size 9)",
  },
  Books: {
    pages: "320 pages",
    language: "English",
    publisher: "Forge Press",
    isbn: "978-1-2345-6789-0",
  },
  Groceries: {
    contents: "Granola, oats, dried fruit, honey",
    servings: "Serves 4",
    storageLife: "9 months unopened",
    ingredients: "Organic, no added sugar",
  },
};

function cleanValue(v) {
  if (v == null) return "";
  if (typeof v === "string") return v.trim();
  return String(v);
}

/**
 * Returns a list of `[label, value]` tuples for the spec table.
 * - Always merges the backend-provided `product.specs` (highest priority).
 * - Fills in missing keys from the category default table.
 * - Order respects the category default; product-supplied keys not present
 *   in the default get appended at the end.
 */
export function productSpecsFor(product) {
  if (!product) return [];
  const provided = (product.specs && typeof product.specs === "object") ? product.specs : {};
  const defaults = CATEGORY_DEFAULTS[product.category] || {};

  const seen = new Set();
  const rows = [];

  for (const key of Object.keys(defaults)) {
    const value = cleanValue(provided[key] ?? defaults[key]);
    if (!value) continue;
    rows.push([SPEC_LABELS[key] || prettyKey(key), value]);
    seen.add(key);
  }

  for (const [key, raw] of Object.entries(provided)) {
    if (seen.has(key)) continue;
    const value = cleanValue(raw);
    if (!value) continue;
    rows.push([SPEC_LABELS[key] || prettyKey(key), value]);
  }

  return rows;
}

function prettyKey(key) {
  if (!key) return "";
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}
