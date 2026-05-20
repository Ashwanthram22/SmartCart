# User profile (embedded per-user data)

Per-user state lives **on the `users` document**, not in separate top-level arrays in `db.json`. API routes are unchanged (`/api/cart`, `/api/saved`, etc.).

## Embedded on each user

| Field | Purpose |
|-------|---------|
| `cart` | `{ items: [{ productId, quantity }], updatedAt }` |
| `savedItems` | `{ items: [...], updatedAt }` — wishlist snapshots |
| `preferences` | Currency, theme, notifications |
| `addresses` | Saved shipping addresses (no `userId` on each row) |
| `stockAlerts` | Back-in-stock subscriptions |
| `priceAlerts` | Price-drop subscriptions |

## Still separate collections

| Collection | Why |
|------------|-----|
| `products` | Global catalog |
| `orders` | Many orders per user; history + admin |
| `coupons` | Store-wide promos (not per user) |
| `reviews` | Per product + user |
| `passwordResets` | Short-lived tokens |
| `auditLogs` | Admin audit trail |

## Example user document

```json
{
  "id": "u1",
  "name": "Demo User",
  "email": "demo@aicart.com",
  "role": "customer",
  "cart": { "items": [], "updatedAt": "2026-05-20T10:00:00.000Z" },
  "savedItems": { "items": [], "updatedAt": "2026-05-20T10:00:00.000Z" },
  "preferences": { "currency": "INR", "theme": "system", "notifications": {} },
  "addresses": [],
  "stockAlerts": [],
  "priceAlerts": []
}
```

Auth responses (`login`, `/me`) still return only `id`, `name`, `email`, `role` — not the embedded profile.

## Code

| File | Role |
|------|------|
| `Backend/src/lib/user-profile.js` | `ensureUserProfile`, `withUserProfile`, legacy migration |
| `Backend/src/lib/migrations.js` | Moves old `carts[]`, `addresses[]`, etc. into `users[]` on boot |
