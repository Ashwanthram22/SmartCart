# `reviews` collection

Product reviews by logged-in customers. Linked to `products.id` and `users.id`.

**Base path:** `/api/products/:id/reviews`  
**Auth:** `Authorization: Bearer <jwt_token>`

---

## MongoDB document (stored)

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

---

## `GET /api/products/p1/reviews`

### Request

No body.

### Response `200`

```json
{
  "reviews": [
    {
      "id": "r1778160156255",
      "productId": "p1",
      "userId": "u1",
      "userName": "Demo User",
      "rating": 4,
      "text": "great",
      "createdAt": "2026-05-07T13:22:36.255Z"
    },
    {
      "id": "r1778160133985",
      "productId": "p1",
      "userId": "u1",
      "userName": "Demo User",
      "rating": 5,
      "text": "good",
      "createdAt": "2026-05-07T13:22:13.985Z"
    }
  ]
}
```

Newest `createdAt` first.

### Error `404`

```json
{
  "message": "Product not found"
}
```

---

## `POST /api/products/p1/reviews`

### Request

```json
{
  "rating": 5,
  "text": "Great product, fast delivery."
}
```

### Response `201`

```json
{
  "message": "Review submitted",
  "review": {
    "id": "r1779000000000",
    "productId": "p1",
    "userId": "u1",
    "userName": "Demo User",
    "rating": 5,
    "text": "Great product, fast delivery.",
    "createdAt": "2026-05-20T12:00:00.000Z"
  }
}
```

### Errors `400`

```json
{ "message": "Rating must be a number between 1 and 5" }
```

```json
{ "message": "Review text is required" }
```

```json
{ "message": "Review text is too long (1500 characters max)" }
```

---

## Included on product detail

`GET /api/products/p1` also returns `reviews` in the same shape:

```json
{
  "product": { "id": "p1", "title": "OmniWatch Pro 4" },
  "similar": [],
  "reviews": [
    {
      "id": "r1778160133985",
      "productId": "p1",
      "userId": "u1",
      "userName": "Demo User",
      "rating": 5,
      "text": "good",
      "createdAt": "2026-05-07T13:22:13.985Z"
    }
  ]
}
```

---

## Code

- `Backend/src/routes/products.routes.js`
