# MongoDB collection docs

One README per collection. Each file includes:

- **MongoDB document** — example JSON as stored in the collection  
- **API request / response** — full example JSON per endpoint (not placeholders)

| Collection | README | Example document (JSON) | Also see |
|------------|--------|-------------------------|----------|
| `users` | [users/README.md](./users/README.md) | [users/example.json](./users/example.json) | [AUTH_USERS_API.md](../AUTH_USERS_API.md), [USER_PROFILE.md](../USER_PROFILE.md), [CART_API.md](../CART_API.md) |
| `products` | [products/README.md](./products/README.md) | [products/example.json](./products/example.json) (one doc), [products/products.json](./products/products.json) (Mongo import array), [MONGO_IMPORT.md](./products/MONGO_IMPORT.md) | — |
| `reviews` | [reviews/README.md](./reviews/README.md) | [reviews/example.json](./reviews/example.json) | — |
| `orders` | [orders/README.md](./orders/README.md) | [orders/example.json](./orders/example.json) | — |
| `coupons` | [coupons/README.md](./coupons/README.md) | [coupons/example.json](./coupons/example.json) (percent), [example.flat.json](./coupons/example.flat.json) (flat) | — |
| `passwordResets` | [passwordResets/README.md](./passwordResets/README.md) | [passwordResets/example.json](./passwordResets/example.json) | [AUTH_USERS_API.md](../AUTH_USERS_API.md) § forgot/reset |
| `auditLogs` | [auditLogs/README.md](./auditLogs/README.md) | [auditLogs/example.json](./auditLogs/example.json) | — |

Overview of all collections: [MONGO_COLLECTIONS.md](../MONGO_COLLECTIONS.md).
