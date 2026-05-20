# `orders` collection

Checkout history — **many orders per user** (`userId`). Line items are a **price snapshot** at order time.

**Base path:** `/api/orders`  
**Auth:** `Authorization: Bearer <jwt_token>`  
**Tax:** 8% on (subtotal − discount), INR.

---

## MongoDB document (stored)

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

---

## `POST /api/orders` — place order

Reads `user.cart` from **`users`**, then clears cart.

### Request

```json
{
  "address": {
    "fullName": "Pack D Tester",
    "line1": "42 Maple St",
    "city": "Springfield",
    "postal": "00042"
  },
  "couponCode": "WELCOME10"
}
```

### Response `201`

```json
{
  "message": "Order placed",
  "order": {
    "id": "o1779000000000",
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
    "storedStatus": "processing",
    "status": "processing",
    "timeline": [
      {
        "label": "Order placed",
        "at": "2026-05-20T12:00:00.000Z",
        "done": true
      },
      {
        "label": "Preparing for shipment",
        "at": "2026-05-20T18:00:00.000Z",
        "done": false
      },
      {
        "label": "Out for delivery",
        "at": "2026-05-21T12:00:00.000Z",
        "done": false
      },
      {
        "label": "Delivered",
        "at": "2026-05-23T12:00:00.000Z",
        "done": false
      }
    ],
    "createdAt": "2026-05-20T12:00:00.000Z",
    "updatedAt": "2026-05-20T12:00:00.000Z"
  }
}
```

`status` in API responses is **computed** from age (`processing` → `transit` → `delivered`). `storedStatus` is what is saved in Mongo.

### Errors `400`

```json
{ "message": "Cart is empty" }
```

```json
{ "message": "Shipping address is required" }
```

```json
{ "message": "That code isn't valid" }
```

---

## `GET /api/orders` — list

### Response `200`

```json
{
  "orders": [
    {
      "id": "o1778574642482",
      "userId": "u1778574592688",
      "items": [
        {
          "productId": "p2",
          "title": "AuraPods Max",
          "image": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80",
          "subtitle": "Audio • 4.9★ rated",
          "unitPrice": 5499,
          "quantity": 1,
          "lineTotal": 5499
        }
      ],
      "subtotal": 5499,
      "discount": 0,
      "tax": 439.92,
      "total": 5938.92,
      "address": {
        "fullName": "Pack D Tester",
        "line1": "42 Maple St",
        "city": "Springfield",
        "postal": "00042"
      },
      "storedStatus": "processing",
      "status": "delivered",
      "timeline": [
        { "label": "Order placed", "at": "2026-05-12T08:30:42.482Z", "done": true },
        { "label": "Preparing for shipment", "at": "2026-05-12T14:30:42.482Z", "done": true },
        { "label": "Out for delivery", "at": "2026-05-13T08:30:42.482Z", "done": true },
        { "label": "Delivered", "at": "2026-05-15T08:30:42.482Z", "done": true }
      ],
      "createdAt": "2026-05-12T08:30:42.482Z",
      "updatedAt": "2026-05-13T08:54:00.766Z",
      "deliveredAt": "2026-05-13T08:54:00.766Z"
    }
  ]
}
```

---

## `GET /api/orders/:id` — one order

### Response `200`

```json
{
  "order": {
    "id": "o1778574632318",
    "userId": "u1778574592688",
    "items": [
      {
        "productId": "p1",
        "title": "OmniWatch Pro 4",
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
    "storedStatus": "cancelled",
    "status": "cancelled",
    "timeline": [
      { "label": "Order placed", "at": "2026-05-12T08:30:32.318Z", "done": true },
      {
        "label": "Cancelled",
        "at": "2026-05-13T08:54:00.780Z",
        "done": true,
        "cancelled": true
      }
    ],
    "createdAt": "2026-05-12T08:30:32.318Z",
    "updatedAt": "2026-05-13T08:54:00.780Z",
    "cancelledAt": "2026-05-13T08:54:00.780Z"
  }
}
```

### Error `404`

```json
{ "message": "Order not found" }
```

---

## `PATCH /api/orders/:id/cancel`

No body.

### Response `200`

```json
{
  "message": "Order cancelled",
  "order": {
    "id": "o1778574632318",
    "storedStatus": "cancelled",
    "status": "cancelled",
    "timeline": [
      { "label": "Order placed", "at": "2026-05-12T08:30:32.318Z", "done": true },
      { "label": "Cancelled", "at": "2026-05-13T08:54:00.780Z", "done": true, "cancelled": true }
    ],
    "updatedAt": "2026-05-13T08:54:00.780Z"
  }
}
```

### Error `409`

```json
{ "message": "Order is already delivered and can no longer be cancelled" }
```

---

## Code

- `Backend/src/routes/orders.routes.js`
- `Backend/src/lib/order-lifecycle.js`
