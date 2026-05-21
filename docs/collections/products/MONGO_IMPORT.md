# Import `products.json` into MongoDB

`products.json` is a **JSON array** — each item is one document for the `products` collection. Every document includes all fields the SmartCart API and product detail page use.

## Required fields (every document)

| Field | Type | Notes |
|-------|------|--------|
| `id` | string | Business id (`el1001`, …) — app lookup key |
| `title` | string | |
| `description` | string | |
| `category` | string | e.g. `Electronics` |
| `brand` | string | |
| `catalogSegments` | string[] | Shop tabs |
| `stock` | number | |
| `price` | number | INR |
| `originalPrice` | number \| null | MRP for strike-through |
| `discountPercent` | number \| null | Sale %; `null` if no discount |
| `rating` | number | 0–5 |
| `reviewCount` | number | Display count (reviews live in `reviews` collection) |
| `badge` | string \| null | Card badge |
| `image` | string | Primary image URL |
| `images` | string[] | Gallery URLs |
| `specs` | object | **3** name → value pairs (detail panel) |
| `similarProductIds` | string[] | **2** other product `id`s in same category |
| `warranty` | `{ label }` | e.g. `{ "label": "2YR WARRANTY" }` |
| `returns` | `{ label }` | e.g. `{ "label": "30-DAY RETURNS" }` |
| `createdAt` | ISO string | |
| `updatedAt` | ISO string | |
| `createdBy` | string | |
| `updatedBy` | string | |

**Not stored on product:** free shipping (UI shows when `price >= 500`).

## MongoDB Compass

1. Open database → `products` collection.
2. **Add Data** → **Import JSON**.
3. Select `products.json` (array format).
4. Confirm document count matches the file (currently **135**: 15 each in Electronics, Mobiles, Laptops, Accessories, Fashion, Home & Kitchen, Sports, Books, Groceries).

## `mongoimport`

```bash
mongoimport --uri="YOUR_MONGODB_URI" --collection=products --file=docs/collections/products/products.json --jsonArray
```

## Adding more categories

Share the next category batch (e.g. Fashion `fa1001`–`fa1015`). Append those objects to the **same JSON array** in `products.json` (or merge arrays), then re-import or insert many.

Regenerate / append categories:

```bash
node scripts/build-electronics-products.js   # resets file to Electronics only (15)
node scripts/append-mobiles-products.js      # appends Mobiles after Electronics (30 total)
node scripts/append-catalog-batches.js scripts/data/laptops-raw.json laptop
node scripts/append-catalog-batches.js scripts/data/accessories-raw.json accessory
node scripts/append-catalog-batches.js scripts/data/fashion-raw.json fashion
node scripts/append-catalog-batches.js scripts/data/home-kitchen-raw.json home-kitchen
node scripts/append-catalog-batches.js scripts/data/sports-raw.json sports
node scripts/append-catalog-batches.js scripts/data/books-raw.json books
node scripts/append-catalog-batches.js scripts/data/groceries-raw.json groceries
```

Raw category batches live under `scripts/data/`. Sports/Books/Groceries items without `specs` get inferred specs at append time (e.g. books: Author, Publisher, Format).

Single-document reference: `example.json`.
