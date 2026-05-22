# Import `reviews.json` into MongoDB

`reviews.json` is a **JSON array** — one review per catalog product (135 documents). Each review links to `products.id` and a seed reviewer in `users/seed-reviewers.json`.

## Required fields (every document)

| Field | Type | Notes |
|-------|------|--------|
| `id` | string | Unique review id (e.g. `r-seed-el1001`) |
| `productId` | string | Must match a document in `products` |
| `userId` | string | Seed reviewer id (`u-seed-01` … `u-seed-05`) |
| `userName` | string | Display name on product detail |
| `rating` | number | 1–5 |
| `text` | string | Review body (max 1500 in API) |
| `createdAt` | ISO string | Newest-first on detail page |

## Import order

1. **`products`** — `products/products.json` (already built)
2. **`users`** — import `users/seed-reviewers.json` first (1 admin + 5 reviewers; or merge with your real accounts)
3. **`reviews`** — this file

Reviews only need `userId` + `userName` for display; seed users keep IDs consistent if you add more reviews later.

## MongoDB Compass

1. Open database → `reviews` collection.
2. **Add Data** → **Import JSON** → select `reviews.json`.
3. Confirm **135** documents.

## `mongoimport`

```bash
mongoimport --uri="YOUR_MONGODB_URI" --collection=reviews --file=docs/collections/reviews/reviews.json --jsonArray
```

## Regenerate from catalog

After changing `products.json`:

```bash
node scripts/generate-reviews-seed.js
```

Seed reviewers password (bcrypt): same hash as demo user `packd-test@aicart.com` — plaintext **`password`** if you need to log in as a seed account for testing.
