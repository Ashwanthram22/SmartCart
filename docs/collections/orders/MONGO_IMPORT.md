# Import `orders.json` into MongoDB

`orders.json` is a **JSON array** — **12** seed orders across **5 customers** (`u-seed-01` … `u-seed-05`). Several orders include the same `productId` (e.g. `el1001`) for different users. Totals match checkout math (8% tax on subtotal − discount).

## Required fields (every document)

| Field | Type | Notes |
|-------|------|--------|
| `id` | string | Unique order id (e.g. `o-seed-priya-001`) |
| `userId` | string | Must exist in `users` — [seed-reviewers.json](../users/seed-reviewers.json) |
| `items` | array | Snapshot lines: `productId`, `title`, `image`, `subtitle`, `unitPrice`, `quantity`, `lineTotal` |
| `subtotal` | number | Sum of `lineTotal` |
| `discount` | number | From coupon at order time (0 if none) |
| `tax` | number | 8% on `(subtotal − discount)` |
| `total` | number | `subtotal − discount + tax` |
| `coupon` | object \| omit | Snapshot from `coupons` (not required) |
| `address` | object | `fullName`, `line1`, `city`, `postal` |
| `status` | string | Stored: `processing` or `cancelled` |
| `createdAt` | ISO string | UI derives Delivered / In transit from age |
| `updatedAt` | ISO string | |
| `cancelledAt` | ISO string \| omit | Set when `status` is `cancelled` |

`productId` values must exist in [products/products.json](../products/products.json).

## Import order

1. **`products`**
2. **`users`** — import seed reviewers (or ensure matching `userId`s exist)
3. **`coupons`** — optional; only needed if you care about coupon labels matching
4. **`orders`** — this file

## MongoDB Compass

1. Open database → `orders` collection.
2. **Add Data** → **Import JSON** → select `orders.json`.
3. Confirm **12** documents.

## `mongoimport`

```bash
mongoimport --uri="YOUR_MONGODB_URI" --collection=orders --file=docs/collections/orders/orders.json --jsonArray
```

## Test logins (order history)

| User | Email | Password | Sample orders |
|------|-------|----------|----------------|
| Priya | `priya@gmail.com` | `123456` | `o-seed-priya-001`, `002`, `003` |
| Rahul | `rahul@gmail.com` | `123456` | `o-seed-rahul-001`, `002`, `003` |
| Ananya | `ananya@gmail.com` | `123456` | `o-seed-ananya-001`, `002` |
| Vikram | `vikram@gmail.com` | `123456` | `o-seed-vikram-001`, `002` |
| Sneha | `sneha@gmail.com` | `123456` | `o-seed-sneha-001`, `002` |

**Admin** (`admin@aicart.com` / `admin123`) sees all 12 under **Admin → Orders**.

**Same product, multiple users:** `el1001` appears on orders for Priya, Rahul, and Ananya — three separate documents, three `userId`s.

## Regenerate after catalog changes

```bash
node scripts/generate-orders-seed.js
```

Edit `SPECS` in that script to add users, lines, or coupons.

Single-document reference: [example.json](./example.json).
