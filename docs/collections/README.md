# MongoDB collection docs

One README per collection. Each file includes:

- **MongoDB document** — example JSON as stored in the collection  
- **API request / response** — full example JSON per endpoint (not placeholders)

| Collection | README | Example document (JSON) | Also see |
|------------|--------|-------------------------|----------|
| `users` | [users/README.md](./users/README.md) | [users/example.json](./users/example.json) | [AUTH_USERS_API.md](../AUTH_USERS_API.md), [USER_PROFILE.md](../USER_PROFILE.md), [CART_API.md](../CART_API.md) |
| `products` | [products/README.md](./products/README.md) | [products/example.json](./products/example.json) (one doc), [products/products.json](./products/products.json) (Mongo import array), [MONGO_IMPORT.md](./products/MONGO_IMPORT.md) | — |
| `reviews` | [reviews/README.md](./reviews/README.md) | [reviews/example.json](./reviews/example.json), [reviews/reviews.json](./reviews/reviews.json) (import array), [reviews/MONGO_IMPORT.md](./reviews/MONGO_IMPORT.md) | Import after `products` + [users/seed-reviewers.json](./users/seed-reviewers.json) |
| `orders` | [orders/README.md](./orders/README.md) | [orders/example.json](./orders/example.json), [orders/orders.json](./orders/orders.json) (import array), [orders/MONGO_IMPORT.md](./orders/MONGO_IMPORT.md) | After `products` + seed `users` |
| `coupons` | [coupons/README.md](./coupons/README.md) | [coupons/example.json](./coupons/example.json) (percent), [example.flat.json](./coupons/example.flat.json) (flat), [coupons/coupons.json](./coupons/coupons.json) (import array), [coupons/MONGO_IMPORT.md](./coupons/MONGO_IMPORT.md) | Independent of catalog; import anytime |
| `passwordResets` | [passwordResets/README.md](./passwordResets/README.md) | [passwordResets/example.json](./passwordResets/example.json) | [AUTH_USERS_API.md](../AUTH_USERS_API.md) § forgot/reset |
| `auditLogs` | [auditLogs/README.md](./auditLogs/README.md) | [auditLogs/example.json](./auditLogs/example.json), [auditLogs/auditLogs.json](./auditLogs/auditLogs.json) (import array), [auditLogs/MONGO_IMPORT.md](./auditLogs/MONGO_IMPORT.md) | Optional; Admin → Activity only |

Overview of all collections: [MONGO_COLLECTIONS.md](../MONGO_COLLECTIONS.md).
