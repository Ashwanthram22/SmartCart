/**
 * Append category batches to docs/collections/products/products.json
 *
 * Usage:
 *   node scripts/append-catalog-batches.js <path-to-raw.json> <mode>
 *   Modes: laptop | accessory | fashion | home-kitchen | sports | books | groceries
 *
 * Raw JSON = array of products from user paste (may include extra spec keys).
 */
const fs = require("fs");
const path = require("path");
const { buildCategoryBatch } = require("./lib/build-product-doc");

const SPEC_LABELS = {
  connectivity: "Connectivity",
  dpi: "DPI",
  buttons: "Buttons",
  scrollWheel: "Scroll Wheel",
  compatibility: "Compatibility",
  layout: "Layout",
  switches: "Switches",
  backlight: "Backlight",
  frame: "Frame",
  sensor: "Sensor",
  drivers: "Drivers",
  frequencyResponse: "Frequency Response",
  microphone: "Microphone",
  surround: "Surround Sound",
  earpads: "Earpads",
  ports: "Ports",
  hdmiOutput: "HDMI Output",
  powerDelivery: "Power Delivery",
  usbSpeed: "USB Speed",
  ethernet: "Ethernet",
  interface: "Interface",
  readSpeed: "Read Speed",
  writeSpeed: "Write Speed",
  security: "Security",
  dimensions: "Dimensions",
  chargingSpeed: "Charging Speed",
  connector: "Connector",
  cableLength: "Cable Length",
  magneticAlignment: "Magnetic Alignment",
  certification: "Certification",
  fieldOfView: "Field of View",
  hdr: "HDR",
  privacyShutter: "Privacy Shutter",
  lightSource: "Light Source",
  colourTemperature: "Colour Temperature",
  brightness: "Brightness",
  control: "Control",
  power: "Power",
  mounting: "Mounting",
  keys: "Keys",
  keyResolution: "Key Resolution",
  software: "Software",
  plugins: "Plugins",
  stand: "Stand",
  wirelessCharging: "Wireless Charging",
  wiredOutput: "Wired Output",
  material: "Material",
  waterResistance: "Water Resistance",
  pockets: "Pockets",
  closure: "Closure",
  colors: "Colours",
  optimizedFor: "Optimized For",
  design: "Design",
  chargingPads: "Charging Pads",
  iphoneSpeed: "iPhone Charging",
  applWatchSpeed: "Apple Watch Charging",
  powerAdapter: "Power Adapter",
  totalPower: "Total Power",
  fastCharging: "Fast Charging",
  technology: "Technology",
  singlePortMax: "Max Single Port",
  graphics: "Graphics",
  battery: "Battery",
  os: "Operating System",
  ram: "Memory",
  processor: "Processor",
  storage: "Storage",
  display: "Display",
  weight: "Weight",
  type: "Type",
  upper: "Upper",
  sole: "Sole",
  midsole: "Midsole",
  outsole: "Outsole",
  cushioning: "Cushioning",
  closure: "Closure",
  sizes: "Sizes",
  colors: "Colours",
  fabric: "Fabric",
  rise: "Rise",
  leg: "Leg",
  waistSizes: "Waist Sizes",
  inseam: "Inseam",
  features: "Features",
  care: "Care",
  lining: "Lining",
  collar: "Collar",
  pockets: "Pockets",
  logo: "Logo",
  frame: "Frame",
  lens: "Lens",
  uvProtection: "UV Protection",
  frameSize: "Frame Size",
  nosePads: "Nose Pads",
  gender: "Gender",
  os: "Operating System",
  sensors: "Sensors",
  waterResistance: "Water Resistance",
  caseSize: "Case Size",
  finish: "Finish",
  material: "Material",
  dimensions: "Dimensions",
  hardware: "Hardware",
  signature: "Signature",
  detail: "Detail",
  origin: "Origin",
  technology: "Technology",
  neckline: "Neckline",
  cardSlots: "Card Slots",
  billCompartment: "Bill Compartment",
  work: "Work",
  silhouette: "Silhouette",
  sleeves: "Sleeves",
  capacity: "Capacity",
  power: "Power",
  temperatureRange: "Temperature Range",
  timer: "Timer",
  panelType: "Panel Type",
  dishwasherSafe: "Dishwasher Safe",
  jars: "Jars",
  speeds: "Speeds",
  bladeType: "Blade Type",
  motorProtection: "Motor Protection",
  warranty: "Warranty",
  color: "Colour",
  heater: "Heater",
  autoCookMenus: "Auto Cook Menus",
  interior: "Interior",
  suctionPower: "Suction Power",
  motorSpeed: "Motor Speed",
  dustbin: "Dustbin",
  filtration: "Filtration",
  laserDetection: "Laser Detection",
  purificationTechnology: "Purification Technology",
  storageTank: "Storage Tank",
  purificationCapacity: "Purification Capacity",
  inputWaterTDS: "Input Water TDS",
  waterSaving: "Water Saving",
  alerts: "Alerts",
  capsuleSystem: "Capsule System",
  brewSizes: "Brew Sizes",
  heatUpTime: "Heat Up Time",
  waterTank: "Water Tank",
  connectivity: "Connectivity",
  functions: "Functions",
  pressureSettings: "Pressure Settings",
  safetyFeatures: "Safety Features",
  innerPot: "Inner Pot",
  programs: "Programs",
  pieces: "Pieces",
  coating: "Coating",
  base: "Base",
  handles: "Handles",
  brightness: "Brightness",
  colorRange: "Color Range",
  colorTemperature: "Color Temperature",
  voiceControl: "Voice Control",
  lifespan: "Lifespan",
  heatingElement: "Heating Element",
  boilTime: "Boil Time",
  safety: "Safety",
  particleCaptureRate: "Particle Capture Rate",
  airflowProjection: "Airflow Projection",
  modes: "Modes",
  noiseLevels: "Noise Levels",
  roomSize: "Room Size",
  microwaveSafe: "Microwave Safe",
  freezerSafe: "Freezer Safe",
  set: "Set",
  tableDimensions: "Table Dimensions",
  tableTop: "Table Top",
  chairSeat: "Chair Seat",
  maxCapacity: "Max Capacity",
  assembly: "Assembly",
  compressor: "Compressor",
  energyRating: "Energy Rating",
  iceMaker: "Ice Maker",
  motorType: "Motor Type",
  sweepSize: "Sweep Size",
  airDelivery: "Air Delivery",
  noiseLevel: "Noise Level",
};

function prettyKey(k) {
  return (
    SPEC_LABELS[k] ||
    k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()).trim()
  );
}

function laptopSpecs(specs) {
  if (!specs) return {};
  return {
    Processor: String(specs.processor || "").trim(),
    Memory: String(specs.ram || "").trim(),
    Storage: String(specs.storage || "").trim(),
  };
}

function pickThreeSpecs(specs) {
  const out = {};
  let n = 0;
  for (const [k, v] of Object.entries(specs || {})) {
    if (n >= 3) break;
    const val = String(v).trim();
    if (!val) continue;
    out[prettyKey(k)] = val;
    n += 1;
  }
  return out;
}

function booksSpecs(p) {
  const picked = pickThreeSpecs(p.specs);
  if (Object.keys(picked).length >= 3) return picked;
  return {
    Author: String(p.author || "—").trim(),
    Publisher: String(p.brand || "").trim(),
    Format: "Paperback",
  };
}

function sportsSpecs(p) {
  const picked = pickThreeSpecs(p.specs);
  if (Object.keys(picked).length >= 3) return picked;
  return {
    Brand: String(p.brand || "").trim(),
    Category: "Sports",
    Type: String(p.badge || "Sports Gear").trim(),
  };
}

function groceriesSpecs(p) {
  const picked = pickThreeSpecs(p.specs);
  if (Object.keys(picked).length >= 3) return picked;
  return {
    Brand: String(p.brand || "").trim(),
    Category: "Groceries",
    Type: String(p.badge || "Grocery").trim(),
  };
}

function resolveSpecs(p, mode) {
  if (mode === "laptop") return laptopSpecs(p.specs);
  if (mode === "books") return booksSpecs(p);
  if (mode === "sports") return sportsSpecs(p);
  if (mode === "groceries") return groceriesSpecs(p);
  return pickThreeSpecs(p.specs);
}

function prepareRaw(raw, mode) {
  return raw.map((p) => ({
    ...p,
    specs: resolveSpecs(p, mode),
  }));
}

function appendBatch(rawPath, mode) {
  const productsPath = path.join(__dirname, "..", "docs", "collections", "products", "products.json");
  const existing = JSON.parse(fs.readFileSync(productsPath, "utf8"));
  if (!Array.isArray(existing)) throw new Error("products.json must be a JSON array");

  const raw = JSON.parse(fs.readFileSync(rawPath, "utf8"));
  if (!Array.isArray(raw)) throw new Error(`${rawPath} must be a JSON array`);

  const existingIds = new Set(existing.map((p) => p.id));
  const prepared = prepareRaw(raw, mode);
  const batch = buildCategoryBatch(prepared);

  for (const p of batch) {
    if (existingIds.has(p.id)) {
      throw new Error(`Duplicate id ${p.id}`);
    }
  }

  const merged = [...existing, ...batch];
  fs.writeFileSync(productsPath, `${JSON.stringify(merged, null, 2)}\n`);

  console.log(`Appended ${batch.length} from ${path.basename(rawPath)}`);
  console.log(`Total products: ${merged.length}`);
  console.log(`First new: ${batch[0].id} | similar: ${batch[0].similarProductIds.join(", ")}`);
  console.log(`Last new: ${batch[batch.length - 1].id} | similar: ${batch[batch.length - 1].similarProductIds.join(", ")}`);
}

const rawPath = process.argv[2];
const mode = process.argv[3];
const VALID_MODES = [
  "laptop",
  "accessory",
  "fashion",
  "home-kitchen",
  "sports",
  "books",
  "groceries",
];
if (!rawPath || !mode || !VALID_MODES.includes(mode)) {
  console.error(
    "Usage: node scripts/append-catalog-batches.js <raw.json> <laptop|accessory|fashion|home-kitchen|sports|books|groceries>"
  );
  process.exit(1);
}

appendBatch(path.resolve(rawPath), mode);
