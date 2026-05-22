# Import `coupons.json` into MongoDB

`coupons.json` is a **JSON array** — **3** store-wide promotion documents. Same codes as `Backend/src/lib/migrations.js` (`SEED_COUPONS`) and the Cart UI hints (`WELCOME10`, `SAVE25`, `AICART`).

## Required fields (every document)

| Field | Type | Notes |
|-------|------|--------|
| `code` | string | Unique lookup key (case-insensitive in API) |
| `type` | string | `"percent"` or `"flat"` |
| `value` | number | Percent 0–100, or flat amount in INR |
| `label` | string | Short label shown in cart/checkout |
| `description` | string | Longer copy |
| `minOrder` | number | Minimum cart subtotal (INR) to apply |
| `active` | boolean | `false` rejects validation |
| `expiresAt` | ISO string \| null | `null` = no expiry; past date = expired |

**No `_id` required** — documents are keyed by `code` in app logic.

## Import order

Coupons are **independent** of products/users/reviews. Import anytime, or after catalog seed if you prefer a full shop setup in one pass:

1. `products` (optional for coupon testing — only cart subtotal matters)
2. `users` / `reviews` (not required for coupons)
3. **`coupons`** — this file

## MongoDB Compass

1. Open database → `coupons` collection.
2. **Add Data** → **Import JSON** → select `coupons.json`.
3. Confirm **3** documents.

If the collection already has rows from file-db migration, **drop or merge** duplicates by `code` before re-import.

## `mongoimport`

```bash
mongoimport --uri="YOUR_MONGODB_URI" --collection=coupons --file=docs/collections/coupons/coupons.json --jsonArray
```

## Seed codes (quick reference)

| Code | Type | Value | Min order (₹) |
|------|------|-------|----------------|
| `WELCOME10` | percent | 10% | 0 |
| `SAVE25` | flat | 2000 | 16000 |
| `AICART` | percent | 15% | 4000 |

## Verify after import

With `USE_MONGO=true` and a logged-in user:

```http
POST /api/coupons/validate
Authorization: Bearer <token>
Content-Type: application/json

{ "code": "WELCOME10", "subtotal": 5000 }
```

Expect `coupon` + `discount` (500 for 10% of 5000).

Single-document examples: `example.json` (percent), `example.flat.json` (flat).
