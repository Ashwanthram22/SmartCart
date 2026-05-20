# MongoDB collections map (SmartCart)

This document maps **each Mongo collection** to the **API routes** that read/write it, with a **realistic JSON example** per collection. It matches the current backend (`db.json` today; same shapes for Mongo).

**Full request/response JSON for every endpoint** lives in [`docs/collections/`](./collections/README.md) (one README per collection).

**Base URL:** `/api`  
**Auth:** Most routes need `Authorization: Bearer <jwt_token>` (JWT `sub` = user `id`).

---

## Overview

| Mongo collection | Scope | API routes |
|----------------|-------|------------|
| **`users`** | One doc per account + **embedded profile** | `/api/auth/*`, `/api/cart/*`, `/api/saved/*`, `/api/addresses/*`, `/api/preferences/*`, `/api/stock-alerts/*`, `/api/price-alerts/*` |
| **`products`** | Global catalog | `/api/products/*`, `/api/admin/products*` |
| **`reviews`** | Per product + user | `/api/products/:id/reviews` |
| **`orders`** | Many per user | `/api/orders/*`, `/api/admin/orders*` |
| **`coupons`** | Global promos | `/api/coupons/validate` (+ used at checkout in `/api/orders`) |
| **`passwordResets`** | Short-lived tokens | `/api/auth/forgot-password`, `/api/auth/reset-password` |
| **`auditLogs`** | Admin audit trail | `/api/admin/audit` |
| *(none)* | Assistant is stateless | `/api/assistant/info`, `/api/assistant/chat` (reads `products` only) |

```text
                    ┌─────────────┐
                    │  products   │◄──── catalog, detail, admin CRUD
                    └──────┬──────┘
                           │ join by productId
     ┌─────────────────────┼─────────────────────┐
     ▼                     ▼                     ▼
┌─────────┐          ┌──────────┐          ┌──────────┐
│  users  │          │  orders  │          │ reviews  │
│ +profile│          │ userId   │          │productId │
└─────────┘          └──────────┘          └──────────┘
 cart, saved,
 addresses, prefs,
 alerts

┌─────────┐     ┌────────────────┐
│ coupons │     │ passwordResets │
└─────────┘     └────────────────┘
```

---

## 1. `users` collection

**One document per customer/admin.** Password is bcrypt-hashed; never returned in API responses.

### APIs that use this collection

| Area | Routes |
|------|--------|
| Auth | `POST /auth/login`, `POST /auth/register`, `POST /auth/google`, `GET /auth/me`, `PATCH /auth/me`, `POST /auth/change-password`, … |
| Cart | `GET/PUT/POST/PATCH/DELETE /cart`, `/cart/items`, … → **`user.cart`** |
| Saved | `GET/PUT/POST/DELETE /saved`, … → **`user.savedItems`** |
| Addresses | `GET/POST/PATCH/DELETE /addresses` → **`user.addresses[]`** |
| Preferences | `GET/PUT /preferences` → **`user.preferences`** |
| Stock alerts | `GET/POST/DELETE /stock-alerts` → **`user.stockAlerts[]`** |
| Price alerts | `GET/POST/DELETE /price-alerts` → **`user.priceAlerts[]`** |

### Example document

```json
{
  "id": "u1778574592688",
  "name": "Pack D Tester",
  "email": "packd-test@aicart.com",
  "password": "$2b$10$...",
  "role": "customer",
  "provider": null,

  "cart": {
    "items": [
      { "productId": "gr1012", "quantity": 2 }
    ],
    "updatedAt": "2026-05-20T10:35:11.023Z"
  },

  "savedItems": {
    "items": [
      {
        "id": "p2",
        "title": "AuraPods Max",
        "subtitle": "Audio • 4.9★ rated",
        "image": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80",
        "category": "electronics",
        "price": 5499,
        "rating": 4.9,
        "savedAt": "2026-05-15T09:59:35.403Z"
      }
    ],
    "updatedAt": "2026-05-15T09:59:35.403Z"
  },

  "preferences": {
    "currency": "INR",
    "theme": "system",
    "notifications": {
      "orderUpdates": true,
      "dealAlerts": true,
      "backInStock": true,
      "priceDrops": true,
      "weeklyDigest": false
    },
    "marketingEmails": false,
    "updatedAt": "2026-05-20T10:35:11.023Z"
  },

  "addresses": [
    {
      "id": "a1778574611334",
      "fullName": "Pack D Tester",
      "line1": "42 Maple St",
      "line2": "",
      "city": "Springfield",
      "postal": "00042",
      "label": "Home",
      "phone": "555-0100",
      "isDefault": true,
      "createdAt": "2026-05-12T08:30:11.334Z",
      "updatedAt": "2026-05-12T08:30:22.783Z"
    }
  ],

  "stockAlerts": [
    {
      "id": "sa1779000000001",
      "productId": "p15",
      "productTitle": "UltraTab 12\" Tablet",
      "createdAt": "2026-05-20T11:00:00.000Z",
      "notified": false
    }
  ],

  "priceAlerts": [
    {
      "id": "pa1779000000001",
      "productId": "p1",
      "productTitle": "OmniWatch Pro 4",
      "targetPrice": 7999,
      "referencePrice": 8999,
      "createdAt": "2026-05-20T11:00:00.000Z",
      "triggered": false
    }
  ]
}
```

**Notes**

- Cart API **stores only** `{ productId, quantity }`; responses **join** full `product` from `products`.
- Login/`/me` return only `id`, `name`, `email`, `role`, `isAdmin` — not the embedded profile.
- Mongo tip: use `legacyId` = `id` during migration; index `email` unique.

---

## 2. `products` collection

**Global catalog** — shared by Home, Catalog, Product detail, Cart (join), Orders (pricing), Admin.

### APIs

| Route | Purpose |
|-------|---------|
| `POST /products` | List/filter/sort/paginate (`segment`, `page`, `limit`, filters) |
| `GET /products` | Same via query (legacy) |
| `POST /products/filters` | Filter chips / facets for a segment |
| `GET /products/:id` | Detail + similar + reviews summary |
| `GET /products/:id/reviews` | Reviews list |
| `POST /admin/products` | Create (admin) |
| `PATCH /admin/products/:id` | Update (admin) |
| `DELETE /admin/products/:id` | Delete (admin) |
| `POST /admin/products/bulk-import` | Bulk import (admin) |

### Example document

```json
{
  "id": "gr1012",
  "title": "Tropicana Mixed Fruit Juice",
  "description": "Refreshing mixed fruit juice packed with natural fruit goodness.",
  "category": "Groceries",
  "brand": "Tropicana",
  "catalogSegments": ["Trending", "Groceries"],
  "stock": 83,
  "price": 149,
  "originalPrice": 199,
  "rating": 4.5,
  "reviewCount": 2190,
  "badge": "REFRESHING",
  "image": "https://images.unsplash.com/photo-1600271886742-f049cd5bba3f?auto=format&fit=crop&w=600&q=80",
  "images": [
    "https://images.unsplash.com/photo-1600271886742-f049cd5bba3f?auto=format&fit=crop&w=1200&q=80"
  ],
  "specs": {
    "volume": "1 L"
  },
  "createdAt": "2026-05-01T08:00:00.000Z",
  "updatedAt": "2026-05-13T13:53:11.295Z",
  "createdBy": "admin@aicart.com",
  "updatedBy": "admin@aicart.com"
}
```

**Mongo indexes (suggested):** `id` unique, `catalogSegments`, `category`, `brand`, text index on `title`/`description`.

---

## 3. `reviews` collection

**Separate from `products`** — one row per review; linked by `productId` + `userId`.

### APIs

| Route | Purpose |
|-------|---------|
| `GET /products/:id/reviews` | List reviews for a product |
| `POST /products/:id/reviews` | Add review (logged-in user) |

### Example document

```json
{
  "id": "r1778160133985",
  "productId": "p1",
  "userId": "u1",
  "userName": "Demo User",
  "rating": 5,
  "text": "good",
  "createdAt": "2026-05-07T13:22:13.985Z"
}
```

**Mongo indexes:** `{ productId: 1, createdAt: -1 }`, unique `{ productId, userId }` if one review per user per product.

---

## 4. `orders` collection

**Many documents per user** (`userId`). Line items are a **snapshot** at checkout (title, price, image frozen on the order).

### APIs

| Route | Purpose |
|-------|---------|
| `POST /orders` | Place order from `user.cart` + shipping address + optional coupon |
| `GET /orders` | List current user's orders |
| `GET /orders/:id` | Order detail |
| `PATCH /orders/:id/cancel` | Cancel while `processing` |
| `GET /admin/orders` | All orders (admin) |
| `PATCH /admin/orders/:id/status` | Update status (admin) |
| `POST /admin/orders/bulk-status` | Bulk status (admin) |

### Example document

```json
{
  "id": "o1778574632318",
  "userId": "u1778574592688",
  "items": [
    {
      "productId": "p1",
      "title": "OmniWatch Pro 4",
      "image": "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80",
      "subtitle": "Wearables • 4.8★ rated",
      "unitPrice": 8999,
      "quantity": 2,
      "lineTotal": 17998
    }
  ],
  "subtotal": 17998,
  "discount": 1799.8,
  "tax": 1295.86,
  "total": 17494.06,
  "coupon": {
    "code": "WELCOME10",
    "type": "percent",
    "value": 10,
    "label": "10% off your first order",
    "description": "Save 10% on any order — no minimum.",
    "minOrder": 0
  },
  "address": {
    "fullName": "Pack D Tester",
    "line1": "42 Maple St",
    "city": "Springfield",
    "postal": "00042"
  },
  "status": "processing",
  "createdAt": "2026-05-12T08:30:32.318Z",
  "updatedAt": "2026-05-12T08:30:32.318Z"
}
```

**Status values:** `processing` → `transit` → `delivered`, or `cancelled`. Optional timestamps: `deliveredAt`, `cancelledAt`.

**Mongo indexes:** `{ userId: 1, createdAt: -1 }`, `{ id: 1 }` unique.

---

## 5. `coupons` collection

**Store-wide** — not per user. Checkout copies a snapshot onto the order as `order.coupon`.

### APIs

| Route | Purpose |
|-------|---------|
| `POST /coupons/validate` | Check code + subtotal; returns discount preview |
| *(internal)* | `POST /orders` re-validates coupon at place-order time |

### Example document

```json
{
  "code": "WELCOME10",
  "type": "percent",
  "value": 10,
  "label": "10% off your first order",
  "description": "Save 10% on any order — no minimum.",
  "minOrder": 0,
  "active": true,
  "expiresAt": null
}
```

**Types:** `percent` (value = %) or `flat` (value = ₹ off).  
**Mongo index:** `{ code: 1 }` unique (uppercase normalized in app).

---

## 6. `passwordResets` collection

**Temporary rows** for forgot-password flow; hashed token at rest.

### APIs

| Route | Purpose |
|-------|---------|
| `POST /auth/forgot-password` | Create reset row + email (dev: link in response) |
| `GET /auth/reset-password/validate` | Check token still valid |
| `POST /auth/reset-password` | Set new password, mark token used |

### Example document

```json
{
  "id": "pr1778570373221",
  "userId": "u1",
  "tokenHash": "b286ebe42e0c8731646ae03449bce0c2f3a7c8c878aec6854f256716e8f4589a",
  "createdAt": "2026-05-12T07:19:33.221Z",
  "expiresAt": 1778573973221,
  "usedAt": "2026-05-12T07:19:34.559Z"
}
```

**Mongo index:** `{ tokenHash: 1 }`, TTL on `expiresAt` optional.

---

## 7. `auditLogs` collection

**Admin-only** — written when products/orders change in admin routes.

### APIs

| Route | Purpose |
|-------|---------|
| `GET /admin/audit` | Paginated audit log |

### Example document

```json
{
  "id": "log-1778680036177-rwlpzs",
  "ts": "2026-05-13T13:47:16.177Z",
  "actorId": "u-admin",
  "actorEmail": "admin@aicart.com",
  "action": "product.update",
  "target": {
    "type": "product",
    "id": "p15"
  },
  "summary": "Updated UltraTab 12\" Tablet (stock)",
  "changes": {
    "stock": { "from": 31, "to": 1 }
  }
}
```

**Mongo index:** `{ ts: -1 }`, `{ actorId: 1 }`.

---

## 8. No collection — `assistant`

| Route | Data |
|-------|------|
| `GET /assistant/info` | Provider name only |
| `POST /assistant/chat` | Reads `products` + optional product context in body; **no chat history stored** in DB today |

---

## What NOT to put in `users`

Keep these as **their own collections** (do not embed in `users`):

| Data | Reason |
|------|--------|
| **Orders** | Grows forever; admin lists all orders |
| **Products** | Shared catalog |
| **Coupons** | Global promos |
| **Reviews** | Query by `productId`; many reviewers per product |
| **Password resets** | Short-lived, security isolation |
| **Audit logs** | Append-only admin history |

---

## Per-collection READMEs

Each collection has a dedicated doc under [`docs/collections/`](./collections/README.md):

| Collection | README |
|------------|--------|
| `users` | [collections/users/README.md](./collections/users/README.md) |
| `products` | [collections/products/README.md](./collections/products/README.md) |
| `reviews` | [collections/reviews/README.md](./collections/reviews/README.md) |
| `orders` | [collections/orders/README.md](./collections/orders/README.md) |
| `coupons` | [collections/coupons/README.md](./collections/coupons/README.md) |
| `passwordResets` | [collections/passwordResets/README.md](./collections/passwordResets/README.md) |
| `auditLogs` | [collections/auditLogs/README.md](./collections/auditLogs/README.md) |

## Other docs

| File | Topic |
|------|--------|
| `AUTH_USERS_API.md` | Auth endpoints (also `users` + `passwordResets`) |
| `CART_API.md` | Cart endpoints + product join |
| `USER_PROFILE.md` | Embedded fields on `users` |
| `Backend/src/lib/mongo/README.md` | Mongoose scaffold / cutover checklist |
