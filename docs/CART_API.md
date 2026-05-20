# Cart API

The cart is **per logged-in user** (`userId` from JWT `sub`). All cart routes require:

```http
Authorization: Bearer <jwt_token>
```

**Base path:** `/api/cart`

---

## Current design (products collection = source of truth)

Cart lines are **not** a second product schema. They reference **`products`** by `id`; the backend loads the product and returns the **same product JSON** the catalog uses, plus cart-only fields (`quantity`).

```text
products collection     users.cart (embedded)
     │                        │
     │  id: "gr1012"          │  items: [{ productId: "gr1012", quantity: 2 }]
     └──────── join on id ────┘
                    │
                    ▼
         API response to frontend:
         { items: [{ quantity: 2, product: { ...full product doc... } }] }
```

### Product document (from `products` collection)

Every cart line’s `product` object should match this shape (example):

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
    "https://images.unsplash.com/photo-1600271886742-f049cd5bba3f?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1497534446932-c925b458314e?auto=format&fit=crop&w=1200&q=80"
  ]
}
```

Optional admin fields on the same document: `specs`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`.

### What to store (minimal)

Per-user cart is embedded on the **`users`** document (`user.cart`), not a separate `carts` collection:

```json
{
  "id": "u1001",
  "name": "Demo User",
  "email": "demo@aicart.com",
  "cart": {
    "items": [{ "productId": "gr1012", "quantity": 2 }],
    "updatedAt": "2026-05-15T09:59:35.403Z"
  }
}
```

Only cart-specific data; **do not duplicate** title/price/image in storage long-term.

| Stored in cart | Comes from `products` on read |
|----------------|-------------------------------|
| `productId` | `id` |
| `quantity` | — |
| — | `title`, `description`, `category`, `brand`, `price`, `stock`, `image`, `images`, `rating`, … |

### Add to cart — frontend payload (current)

Frontend API call sends **only** `productId` + `quantity`. The UI calls `addItem(product)` with the full catalog object for instant display; only id/qty go to the server.

```json
{
  "productId": "gr1012",
  "quantity": 1
}
```

Backend:

1. `products.findOne({ id: "gr1012" })` (or `_id`)
2. If missing → `404 Product not found`
3. If `stock < 1` → `400 Out of stock`
4. Upsert cart line, cap `quantity` by `product.stock`
5. Return enriched cart (see below)

### Cart API response (all `GET` / `POST` / `PUT` / `PATCH` / `DELETE` cart routes)

```json
{
  "items": [
    {
      "productId": "gr1012",
      "quantity": 2,
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
        "images": ["https://..."]
      },
      "lineTotal": 298
    }
  ],
  "subtotal": 298,
  "itemCount": 2,
  "updatedAt": "2026-05-15T10:05:00.000Z"
}
```

- **`itemCount`** — sum of `quantity` (for navbar badge; same formula as today).
- **`lineTotal`** — `product.price * quantity` (server-calculated).
- **`subtotal`** — sum of line totals.
- UI uses `product.title`, `product.image`, `product.price`, `product.stock` — same as catalog cards.

### Navbar count (unchanged idea)

```js
itemCount = items.reduce((sum, line) => sum + line.quantity, 0);
```

Each line is `{ product, quantity, lineTotal }`; only **`quantity`** drives the badge.

### UI display (not stored)

Cart page subtitle text is built in the frontend (not saved in DB):

```text
{product.category} • {product.rating}★ rated
```

Helper: `Frontend/src/utils/cartLine.js` → `cartLineSubtitle(product)`.

---

## Standard cart response (all mutations)

Every successful cart endpoint returns:

```json
{
  "items": [
    {
      "productId": "gr1012",
      "quantity": 2,
      "product": { /* full document from products collection */ },
      "lineTotal": 298
    }
  ],
  "subtotal": 298,
  "itemCount": 2,
  "updatedAt": "2026-05-15T10:00:00.000Z"
}
```

| Field | Source |
|-------|--------|
| `product` | `products` collection (live lookup by `productId`) |
| `lineTotal` | `product.price × quantity` (server) |
| `subtotal` | Sum of `lineTotal` |
| `itemCount` | Sum of `quantity` (navbar badge) |

---

## 1. Get cart

**`GET /api/cart`**

### Request

No body.

### Success — `200`

Same shape as [Standard cart response](#standard-cart-response-all-mutations) (enriched `items` + `subtotal` + `itemCount`).

On **page refresh** (already logged in): frontend uses **server cart only** (does not merge/add quantities with `localStorage`).

On **login**: guest `localStorage` cart is merged into server once via `PUT /cart` (see [Navbar / sync](#navbar-cart-count--how-it-updates)).

---

## 2. Add to cart (click “Add to cart”)

**`POST /api/cart/items`**

This is the API called **after** the UI updates locally (see [Navbar count flow](#navbar-cart-count-how-it-updates) below).

### Request body (frontend → API)

```json
{
  "productId": "gr1012",
  "quantity": 1
}
```

| Field | Required | Notes |
|-------|----------|--------|
| `productId` | Yes | Must exist in `products` (`id` field) |
| `quantity` | No | Default `1`; max **99** per line |

Frontend:

- UI: `addItem(product)` — full product object for optimistic UI (`CartProvider`)
- API: `addCartItem({ productId, quantity })` in `api/client.js`

**Backend behaviour**

1. Load product from `products` by `productId`
2. If not found → `404 Product not found`
3. If `stock < 1` → `400 Product is out of stock`
4. If line exists → increase `quantity` (capped by `product.stock` and 99)
5. Else append line (max **50** distinct lines)
6. Return enriched cart (standard response shape)

### Success — `200`

Standard cart response (with `product`, `lineTotal`, `subtotal`, `itemCount`).

### Errors

| Status | Body |
|--------|------|
| `400` | `{ "message": "productId is required" }` |
| `400` | `{ "message": "Product is out of stock" }` |
| `400` | `{ "message": "Cart cannot exceed 50 items" }` |
| `404` | `{ "message": "Product not found" }` |

---

## 3. Replace entire cart (login merge)

**`PUT /api/cart`**

### Request body

Minimal lines only (extra fields are ignored; only `productId` + `quantity` are stored):

```json
{
  "items": [
    { "productId": "gr1012", "quantity": 1 },
    { "productId": "p2", "quantity": 2 }
  ]
}
```

Used on **login** to persist merged guest + server cart. Unknown `productId` values are skipped.

### Success — `200`

Standard cart response.

### Error — `400`

```json
{ "message": "Cart cannot exceed 50 items" }
```

---

## 4. Update quantity (cart page +/-)

**`PATCH /api/cart/items/:productId`**

### Request body

```json
{
  "quantity": 3
}
```

- `quantity: 0` → removes the line (same as delete).

### Success — `200`

```json
{
  "items": [ /* updated cart */ ],
  "updatedAt": "..."
}
```

### Error — `404`

```json
{ "message": "Line not found" }
```

---

## 5. Remove one line

**`DELETE /api/cart/items/:productId`**

No body.

### Success — `200`

```json
{
  "items": [ /* cart without that productId */ ],
  "updatedAt": "..."
}
```

---

## 6. Clear cart

**`DELETE /api/cart`**

No body.

### Success — `200`

```json
{
  "items": [],
  "updatedAt": "..."
}
```

Also runs after **place order** (server clears cart when order is created).

---

## Navbar cart count — how it updates

The badge is **not** a separate API. It comes from **React context** (`CartProvider`).

### Flow when user clicks “Add to cart”

```text
1. Button onClick → useCart().addItem(product)
2. CartProvider updates items in memory (optimistic) with full product object
3. itemCount = sum of quantity
4. ShopTopNav shows badge from itemCount
5. localStorage mirror (aicart_cart_v1)
6. POST /api/cart/items { productId, quantity } only
7. On success → setItems(server response with enriched product objects)
```

### `itemCount` formula

```js
itemCount = items.reduce((sum, line) => sum + line.quantity, 0);
```

- **Not** the number of different products.
- **Total units** across all lines (qty 2 + qty 1 → badge **3**).

### Where the badge is rendered

`ShopTopNav.jsx`:

```jsx
const { itemCount } = useCart();
// ...
{itemCount > 0 ? (
  <span className="shop-cart-badge">{itemCount > 99 ? "99+" : itemCount}</span>
) : null}
```

Any page using `ShopTopNav` (home, catalog, product detail) shares the same count because `CartProvider` wraps the app in `main.jsx`.

### On page refresh (logged in)

```text
GET /api/cart  →  setItems(server items only)  →  no localStorage merge (avoids qty doubling)
```

### On login only (guest cart merge)

```text
GET /api/cart + merge guest localStorage once  →  PUT /api/cart  →  setItems(merged)
```

Logout clears `localStorage` cart key.

---

## Frontend ↔ API mapping

| UI action | Context method | API |
|-----------|----------------|-----|
| Add to cart | `addItem(payload)` | `POST /cart/items` |
| Cart page qty | `setQuantity(productId, qty)` | `PATCH /cart/items/:productId` |
| Remove line | `removeItem(productId)` | `DELETE /cart/items/:productId` |
| Clear cart | `clearCart()` | `DELETE /cart` |
| Login sync | (inside `CartProvider`) | `GET /cart` then maybe `PUT /cart` |
| Navbar count | `itemCount` from `useCart()` | *(no API — derived from `items`)* |

---

## Example: click Add to cart end-to-end

**User clicks** on catalog card for product `p1`.

**1. UI:** `addItem(product)` with full catalog product JSON.

**2. API request:**

```http
POST /api/cart/items
Authorization: Bearer <token>
Content-Type: application/json

{ "productId": "gr1012", "quantity": 1 }
```

**3. API response:** `{ items: [{ productId, quantity, product, lineTotal }], subtotal, itemCount, updatedAt }`.

**4. MongoDB `users`:** `cart: { items: [{ productId, quantity }], updatedAt }` — product fields only in `products` collection.

---

## Limits (backend)

| Rule | Value |
|------|--------|
| Max quantity per line | 99 |
| Max distinct lines | 50 |
| Auth | Required on all `/api/cart` routes |

---

## Related files

| Area | Path |
|------|------|
| Backend routes | `Backend/src/routes/cart.routes.js` |
| Product join helper | `Backend/src/lib/cart-lines.js` |
| API client | `Frontend/src/api/client.js` |
| Cart line UI helpers | `Frontend/src/utils/cartLine.js` |
| Cart state + count | `Frontend/src/context/CartProvider.jsx` |
| Hook | `Frontend/src/hooks/useCart.js` |
| Navbar badge | `Frontend/src/components/ShopTopNav.jsx` |
| Add on home | `Frontend/src/pages/Home/ProductCard.jsx` |
| Add on catalog | `Frontend/src/pages/Catalog/ProductsCatalog.jsx` |
| Add on detail | `Frontend/src/pages/Catalog/ProductDetail.jsx` |
| Cart page | `Frontend/src/pages/Cart/Cart.jsx` |
