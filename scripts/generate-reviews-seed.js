/**
 * Build docs/collections/reviews/reviews.json — one seed review per product in products.json.
 *
 * Usage: node scripts/generate-reviews-seed.js
 */
const fs = require("fs");
const path = require("path");

const REVIEWERS = [
  { userId: "u-seed-01", userName: "Priya Sharma" },
  { userId: "u-seed-02", userName: "Rahul Mehta" },
  { userId: "u-seed-03", userName: "Ananya Iyer" },
  { userId: "u-seed-04", userName: "Vikram Singh" },
  { userId: "u-seed-05", userName: "Sneha Kapoor" },
];

const TEXT_BY_CATEGORY = {
  Electronics: [
    "Works exactly as described. Setup was quick and the build quality feels premium.",
    "Solid performance for the price. Would buy again for daily use.",
    "Happy with the purchase — battery life and features match what I expected.",
  ],
  Mobiles: [
    "Camera and display are excellent. Battery easily lasts a full day.",
    "Smooth performance and fast charging. Great value in this range.",
    "No regrets — calls, gaming, and photos all feel top-tier.",
  ],
  Laptops: [
    "Fast for work and light gaming. Keyboard and screen are comfortable for long sessions.",
    "Boots quickly and stays quiet. Perfect for office and travel.",
    "Build feels sturdy and the display is sharp. Highly recommend.",
  ],
  Accessories: [
    "Fits my setup perfectly. Quality is better than I expected at this price.",
    "Daily driver now — comfortable and reliable.",
    "Small upgrade that made a big difference. Worth it.",
  ],
  Fashion: [
    "True to size and looks great. Fabric quality is on point.",
    "Comfortable all day. Got compliments the first time I wore it.",
    "Stylish and well made — matches the photos.",
  ],
  "Home & Kitchen": [
    "Makes everyday cooking easier. Easy to clean and store.",
    "Works well and feels durable. Good addition to the kitchen.",
    "Does the job reliably — happy with how it performs.",
  ],
  Sports: [
    "Good grip and build for training. Using it every week.",
    "Comfortable and durable — exactly what I needed for workouts.",
    "Great for home gym and outdoor sessions alike.",
  ],
  Books: [
    "Engaging read from start to finish. Already recommended to friends.",
    "Clear writing and practical takeaways. Worth every rupee.",
    "One of the best books I've picked up this year.",
  ],
  Groceries: [
    "Fresh taste and good packaging. Reordering regularly.",
    "Quality is consistent — family liked it.",
    "Good value pack. Arrived in perfect condition.",
  ],
};

const DEFAULT_TEXT = [
  "Exactly what I needed. Fast delivery and no issues so far.",
  "Happy customer — product matches the listing.",
  "Would recommend. Good quality for the price.",
];

function pick(arr, index) {
  return arr[index % arr.length];
}

function ratingFromProduct(product, index) {
  const base = Number(product.rating) || 4.5;
  const bump = index % 3 === 0 ? 0 : index % 3 === 1 ? -0.5 : 0.5;
  return Math.min(5, Math.max(4, Math.round(base + bump)));
}

function main() {
  const productsPath = path.join(
    __dirname,
    "..",
    "docs",
    "collections",
    "products",
    "products.json"
  );
  const outPath = path.join(
    __dirname,
    "..",
    "docs",
    "collections",
    "reviews",
    "reviews.json"
  );

  const products = JSON.parse(fs.readFileSync(productsPath, "utf8"));
  if (!Array.isArray(products)) throw new Error("products.json must be an array");

  const baseTime = Date.parse("2026-04-01T10:00:00.000Z");

  const reviews = products.map((product, i) => {
    const reviewer = pick(REVIEWERS, i);
    const texts = TEXT_BY_CATEGORY[product.category] || DEFAULT_TEXT;
    const text = pick(texts, i);
    const idSuffix = String(product.id).replace(/[^a-z0-9]/gi, "");

    return {
      id: `r-seed-${idSuffix}`,
      productId: product.id,
      userId: reviewer.userId,
      userName: reviewer.userName,
      rating: ratingFromProduct(product, i),
      text,
      createdAt: new Date(baseTime + i * 3600000).toISOString(),
    };
  });

  fs.writeFileSync(outPath, `${JSON.stringify(reviews, null, 2)}\n`);
  console.log(`Wrote ${reviews.length} reviews to ${outPath}`);
}

main();
