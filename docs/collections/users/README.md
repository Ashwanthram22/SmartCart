# `users` collection

One Mongo document per account. Auth fields plus **embedded profile** (cart, saved list, preferences, addresses, alerts).

**Auth header (profile routes):** `Authorization: Bearer <jwt_token>`

**Also see:** [AUTH_USERS_API.md](../../AUTH_USERS_API.md) · [USER_PROFILE.md](../../USER_PROFILE.md) · [CART_API.md](../../CART_API.md)

---

## MongoDB document (stored)

```json
{
  "id": "u1778574592688",
  "name": "Pack D Tester",
  "email": "packd-test@aicart.com",
  "password": "$2b$10$4o.Pltd63dIBfbhEGlYluuwA28soBpf3Qak93KQGINXK9TYYr3YQK",
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

---

## Auth — `POST /api/auth/login` (creates session only; returns public user)

### Request

```json
{
  "email": "demo@aicart.com",
  "password": "demo123"
}
```

### Response `200`

```json
{
  "message": "Login successful",
  "jwt_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "u1",
    "name": "Demo User",
    "email": "demo@aicart.com",
    "role": "customer",
    "isAdmin": false
  }
}
```

Password and embedded profile are **not** returned on login.

---

## Cart — `/api/cart` → `user.cart`

Stored: `{ productId, quantity }` only. API responses join `products`.

### `GET /api/cart` — Response `200`

```json
{
  "items": [
    {
      "productId": "gr1012",
      "quantity": 2,
      "product": {
        "id": "gr1012",
        "title": "Tropicana Mixed Fruit Juice",
        "category": "Groceries",
        "brand": "Tropicana",
        "price": 149,
        "originalPrice": 199,
        "stock": 83,
        "rating": 4.5,
        "image": "https://images.unsplash.com/photo-1600271886742-f049cd5bba3f?auto=format&fit=crop&w=600&q=80"
      },
      "lineTotal": 298
    }
  ],
  "subtotal": 298,
  "itemCount": 2,
  "updatedAt": "2026-05-20T10:35:11.023Z"
}
```

### `POST /api/cart/items` — Request

```json
{
  "productId": "gr1012",
  "quantity": 1
}
```

Response: same shape as `GET /cart` above.

---

## Saved — `/api/saved` → `user.savedItems`

### `GET /api/saved` — Response `200`

```json
{
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
}
```

### `POST /api/saved/items` — Request

```json
{
  "id": "p2",
  "title": "AuraPods Max",
  "subtitle": "Audio",
  "image": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80",
  "category": "electronics",
  "price": 5499,
  "rating": 4.9
}
```

### Response `200`

```json
{
  "items": [ /* full list after add */ ],
  "updatedAt": "2026-05-20T12:00:00.000Z"
}
```

---

## Addresses — `/api/addresses` → `user.addresses[]`

### `GET /api/addresses` — Response `200`

```json
{
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
  ]
}
```

### `POST /api/addresses` — Request

```json
{
  "fullName": "Pack D Tester",
  "line1": "42 Maple St",
  "line2": "Apt 2B",
  "city": "Springfield",
  "postal": "00042",
  "label": "Home",
  "phone": "555-0100",
  "isDefault": true
}
```

### Response `201`

```json
{
  "address": {
    "id": "a1779000000000",
    "fullName": "Pack D Tester",
    "line1": "42 Maple St",
    "line2": "Apt 2B",
    "city": "Springfield",
    "postal": "00042",
    "label": "Home",
    "phone": "555-0100",
    "isDefault": true,
    "createdAt": "2026-05-20T12:00:00.000Z"
  }
}
```

---

## Preferences — `/api/preferences` → `user.preferences`

### `GET /api/preferences` — Response `200`

```json
{
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
  }
}
```

### `PUT /api/preferences` — Request (partial)

```json
{
  "theme": "dark",
  "notifications": {
    "weeklyDigest": true
  }
}
```

### Response `200`

```json
{
  "preferences": {
    "currency": "INR",
    "theme": "dark",
    "notifications": {
      "orderUpdates": true,
      "dealAlerts": true,
      "backInStock": true,
      "priceDrops": true,
      "weeklyDigest": true
    },
    "marketingEmails": false,
    "updatedAt": "2026-05-20T12:00:00.000Z"
  }
}
```

---

## Stock alerts — `/api/stock-alerts` → `user.stockAlerts[]`

### `POST /api/stock-alerts` — Request

```json
{
  "productId": "p15"
}
```

### Response `201`

```json
{
  "alert": {
    "id": "sa1779000000001",
    "productId": "p15",
    "productTitle": "UltraTab 12\" Tablet",
    "createdAt": "2026-05-20T12:00:00.000Z",
    "notified": false
  },
  "alreadyExists": false
}
```

### `GET /api/stock-alerts` — Response `200`

```json
{
  "alerts": [
    {
      "id": "sa1779000000001",
      "productId": "p15",
      "productTitle": "UltraTab 12\" Tablet",
      "createdAt": "2026-05-20T12:00:00.000Z",
      "notified": false
    }
  ]
}
```

---

## Price alerts — `/api/price-alerts` → `user.priceAlerts[]`

### `POST /api/price-alerts` — Request

```json
{
  "productId": "p1",
  "targetPrice": 7999
}
```

### Response `201`

```json
{
  "alert": {
    "id": "pa1779000000001",
    "productId": "p1",
    "productTitle": "OmniWatch Pro 4",
    "targetPrice": 7999,
    "referencePrice": 8999,
    "createdAt": "2026-05-20T12:00:00.000Z",
    "triggered": false
  },
  "updated": false
}
```

### `GET /api/price-alerts` — Response `200`

```json
{
  "alerts": [
    {
      "id": "pa1779000000001",
      "productId": "p1",
      "productTitle": "OmniWatch Pro 4",
      "targetPrice": 7999,
      "referencePrice": 8999,
      "createdAt": "2026-05-20T12:00:00.000Z",
      "triggered": false
    }
  ]
}
```

---

## Common errors

```json
{ "message": "Authorization header required" }
```

```json
{ "message": "User not found" }
```

```json
{ "message": "You can save at most 10 addresses" }
```

---

## Seed import (`seed-reviewers.json`)

Mongo import array: [seed-reviewers.json](./seed-reviewers.json) — **6 users** (1 admin + 5 demo customers for reviews).

| Account | Email | Password | Role |
|---------|-------|----------|------|
| Admin | `admin@aicart.com` | `admin123` | `admin` (`isAdmin: true`) |
| Reviewers | `priya@gmail.com`, … | `123456` (plaintext in file; hashed on file-db startup) | `customer` |

Admin password in JSON is **bcrypt** so Mongo import works without running migrations. Change credentials after first login in production.

---

## Code

- `Backend/src/lib/user-profile.js`
- `Backend/src/lib/mongo/models/User.js` (scaffold)
