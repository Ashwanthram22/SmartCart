# `coupons` collection

**Store-wide** promotion codes. Checkout copies a snapshot onto `orders.coupon`.

**Base path:** `/api/coupons`  
**Auth:** `Authorization: Bearer <jwt_token>`

---

## MongoDB document (stored) — percent

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

## MongoDB document (stored) — flat

```json
{
  "code": "SAVE25",
  "type": "flat",
  "value": 2000,
  "label": "₹2,000 off orders over ₹16,000",
  "description": "Take ₹2,000 off when your subtotal is at least ₹16,000.",
  "minOrder": 16000,
  "active": true,
  "expiresAt": null
}
```

---

## `POST /api/coupons/validate`

### Request

```json
{
  "code": "WELCOME10",
  "subtotal": 17998
}
```

### Response `200` — percent coupon

```json
{
  "coupon": {
    "code": "WELCOME10",
    "type": "percent",
    "value": 10,
    "label": "10% off your first order",
    "description": "Save 10% on any order — no minimum.",
    "minOrder": 0
  },
  "discount": 1799.8
}
```

### Request — flat coupon

```json
{
  "code": "SAVE25",
  "subtotal": 20000
}
```

### Response `200` — flat coupon

```json
{
  "coupon": {
    "code": "SAVE25",
    "type": "flat",
    "value": 2000,
    "label": "₹2,000 off orders over ₹16,000",
    "description": "Take ₹2,000 off when your subtotal is at least ₹16,000.",
    "minOrder": 16000
  },
  "discount": 2000
}
```

### Errors `400`

```json
{ "message": "Enter a coupon code" }
```

```json
{ "message": "Subtotal is required" }
```

```json
{ "message": "That code isn't valid" }
```

```json
{ "message": "That code is no longer active" }
```

```json
{ "message": "That code has expired" }
```

```json
{ "message": "Add ₹500.00 more to use SAVE25 (min order ₹16000)" }
```

---

## Snapshot saved on order (`orders` collection)

When checkout succeeds with a coupon:

```json
{
  "id": "o1778574632318",
  "coupon": {
    "code": "WELCOME10",
    "type": "percent",
    "value": 10,
    "label": "10% off your first order",
    "description": "Save 10% on any order — no minimum.",
    "minOrder": 0
  },
  "discount": 1799.8,
  "subtotal": 17998,
  "tax": 1295.86,
  "total": 17494.06
}
```

---

## Seed codes

| Code | Type | Value | Min order (₹) |
|------|------|-------|----------------|
| `WELCOME10` | percent | 10% | 0 |
| `SAVE25` | flat | 2000 | 16000 |
| `AICART` | percent | 15% | 4000 |

---

## Code

- `Backend/src/routes/coupons.routes.js`
