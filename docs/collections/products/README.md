# `products` collection

Global catalog shared by Home, Catalog, Product detail, Cart (join), Orders (pricing), and Admin.

**Base path:** `/api/products`  
**Auth:** `Authorization: Bearer <jwt_token>`

---

## MongoDB document (stored)

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
  "updatedAt": "2026-05-13T13:53:11.295Z"
}
```

---

## `POST /api/products` — list / filter

### Request

```json
{
  "segment": "AI Picks",
  "q": "juice",
  "brand": ["Tropicana"],
  "priceMin": 100,
  "priceMax": 500,
  "minRating": 4,
  "sort": "price-asc",
  "page": 1,
  "limit": 12
}
```

### Response `200` (with `page` / `limit`)

```json
{
  "items": [
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
      "image": "https://images.unsplash.com/photo-1600271886742-f049cd5bba3f?auto=format&fit=crop&w=600&q=80"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 12,
  "totalPages": 1,
  "hasMore": false,
  "sort": "price-asc"
}
```

### Response `200` (no pagination — bare array)

When `page` and `limit` are omitted:

```json
[
  {
    "id": "gr1012",
    "title": "Tropicana Mixed Fruit Juice",
    "price": 149,
    "rating": 4.5,
    "image": "https://images.unsplash.com/photo-1600271886742-f049cd5bba3f?auto=format&fit=crop&w=600&q=80"
  }
]
```

---

## `POST /api/products/filters` — facets

### Request

```json
{
  "segment": "Trending",
  "q": ""
}
```

### Response `200`

```json
{
  "segment": "Trending",
  "totalCount": 12,
  "price": { "min": 149, "max": 53999 },
  "brands": ["AuraTech", "Nexus", "Tropicana"],
  "ratings": [3, 3.5, 4, 4.5],
  "specifications": {
    "Display": ["12-inch Liquid Retina", "1.4-inch AMOLED"],
    "Processor": ["Apple M3"]
  }
}
```

---

## `GET /api/products/:id` — detail

### Request

No body. Example: `GET /api/products/gr1012`

### Response `200`

```json
{
  "product": {
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
    ]
  },
  "similar": [
    {
      "id": "p14",
      "title": "AeroGarden Harvest",
      "price": 7299,
      "rating": 4.8,
      "image": "https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?auto=format&fit=crop&w=600&q=80"
    }
  ],
  "reviews": [
    {
      "id": "r1778160133985",
      "productId": "gr1012",
      "userId": "u1",
      "userName": "Demo User",
      "rating": 5,
      "text": "good",
      "createdAt": "2026-05-07T13:22:13.985Z"
    }
  ]
}
```

### Error `404`

```json
{
  "message": "Product not found"
}
```

---

## Reviews on this product

See [reviews/README.md](../reviews/README.md) for `GET/POST /api/products/:id/reviews`.

---

## Code

- `Backend/src/routes/products.routes.js`
- `Backend/src/lib/segments.js`
