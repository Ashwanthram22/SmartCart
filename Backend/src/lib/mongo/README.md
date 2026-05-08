# MongoDB scaffold (dormant)

This folder is the staging area for tomorrow's MongoDB integration. Nothing in
it executes today — the app continues to read/write `src/data/db.json` via
`src/lib/data-store.js`.

## What's here

| File | Purpose |
|---|---|
| `connection.js` | `connectMongo()` / `disconnectMongo()` helpers, fully commented out. |
| `models/User.js` | Mongoose schema mirroring the current `users[]` shape. |
| `models/Product.js` | Mongoose schema mirroring the current `products[]` shape. |
| `models/Review.js` | Mongoose schema mirroring `reviews[]` (+ unique `(productId, userId)` index). |
| `models/Cart.js` | One cart per user; items inlined as a sub-array. |
| `models/Order.js` | Order schema with the `cancelled` status added. |
| `models/index.js` | Convenience barrel re-export. |

Every model file currently exports `null`. Once you uncomment the schema body
the export becomes the real Mongoose model.

## Switch-on checklist (for tomorrow)

1. Add real values to `.env`:
   ```env
   MONGODB_URI=mongodb+srv://...
   USE_MONGO=true
   ```
2. Uncomment the bodies of `connection.js` and the model files.
3. In `src/server.js`, uncomment the `connectMongo()` line in `bootstrap()`.
4. Cut routes over from `lib/data-store.js` to the model imports one at a
   time. Keep `data-store.js` intact while you migrate so the file db can
   serve the rest.
5. Write a one-shot script (e.g. `scripts/seed-from-json.js`) that reads
   `db.json` and `insertMany`s each collection — preserve `legacyId` so
   foreign keys (cart.userId, order.userId) keep matching while the cutover
   is in progress.

## Why a scaffold and not a real connection today?

The user (Ashwanth) asked for the wiring laid out in advance so the actual
switch is a small, mechanical, no-debugging change. None of the data in
`db.json` is touched. None of the API surface changes. The chatbot, cart,
orders and reviews keep working exactly as they do now.
