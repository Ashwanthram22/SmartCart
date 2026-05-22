# Import `auditLogs.json` into MongoDB

`auditLogs.json` is a **JSON array** — **16** demo admin activity rows for **Admin → Activity**. Targets use ids from [products/products.json](../products/products.json) and [orders/orders.json](../orders/orders.json).

## Required fields (every document)

| Field | Type | Notes |
|-------|------|--------|
| `id` | string | Unique log id (e.g. `log-seed-001`) |
| `ts` | ISO string | When the action happened (newest first in UI) |
| `actorId` | string | Admin user id (`u-admin` in seed) |
| `actorEmail` | string | Display in filters (`admin@aicart.com`) |
| `action` | string | `product.update`, `product.create`, `product.delete`, `order.status`, `order.bulk-status` |
| `target` | object | `{ type: "product" \| "order", id: string \| null }` |
| `summary` | string | Human-readable line in Activity feed |
| `changes` | object \| omit | `{ field: { from, to } }` for updates |
| `meta` | object \| omit | Extra context (e.g. bulk order ids) |

## Import order

**Optional** — import anytime. Recommended after seed data exists so links make sense:

1. `products`, `users`, `orders` (and other shop collections)
2. **`auditLogs`** — this file

New logs are still **appended automatically** when admins use Inventory or Orders (no import needed for live ops).

## MongoDB Compass

1. Open database → `auditLogs` collection.
2. **Add Data** → **Import JSON** → select `auditLogs.json`.
3. Confirm **16** documents.

## `mongoimport`

```bash
mongoimport --uri="YOUR_MONGODB_URI" --collection=auditLogs --file=docs/collections/auditLogs/auditLogs.json --jsonArray
```

## Seed actor

| Field | Value |
|-------|--------|
| `actorId` | `u-admin` |
| `actorEmail` | `admin@aicart.com` |

Log in as **admin@aicart.com** / **admin123** (from [users/seed-reviewers.json](../users/seed-reviewers.json)) to match the actor on seeded rows.

## What this does **not** power

| Admin area | Data source |
|------------|-------------|
| Dashboard “Recent activity” | `GET /api/admin/recent-activity` (orders + products + users) |
| Dashboard stats / chart | `orders`, `products`, `users` |
| Inventory | `products` |
| Orders | `orders` |
| Analytics | `products`, `orders`, `users` |
| **Activity tab** | **`auditLogs`** (this file) |

## Regenerate

```bash
node scripts/generate-audit-logs-seed.js
```

Single-document reference: [example.json](./example.json).
