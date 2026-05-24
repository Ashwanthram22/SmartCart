# MongoDB

When `USE_MONGO=true` and `MONGODB_URI` are set in `Backend/.env`, the API reads
and writes through Mongoose (`lib/mongo-store.js`) instead of `src/data/db.json`.

## Collections

| Collection | Model | Business key |
|---|---|---|
| `users` | `User` | `id` (cart + saved embedded on user) |
| `products` | `Product` | `id` |
| `reviews` | `Review` | `id` |
| `orders` | `Order` | `id` |
| `coupons` | `Coupon` | `code` |
| `auditLogs` | `AuditLog` | `id` |
| `passwordResets` | `PasswordReset` | `id` |

Import seed arrays from `docs/collections/*/*.json` (see each folder’s
`MONGO_IMPORT.md`).

## Enable

```env
USE_MONGO=true
MONGODB_URI=mongodb+srv://USER:PASS@cluster.mongodb.net/smartcart?retryWrites=true&w=majority
```

Restart the backend. Startup migrations still run (bcrypt-hash plaintext
passwords in imported users, ensure profile shape, seed admin if missing).

Verify:

```bash
cd Backend
npm run mongo:ping
npm run dev
curl http://localhost:5000/api/health
```

### `querySrv ECONNREFUSED` (Windows)

Node’s DNS resolver often cannot resolve `mongodb+srv://` on Windows even when
`nslookup` works. The backend sets Google DNS (`8.8.8.8`, `8.8.4.4`) automatically
on Windows before connecting.

Override in `.env`:

```env
# Use system DNS instead of 8.8.8.8 (only if you know SRV works in Node)
# MONGODB_DNS_SERVERS=system

# Or pick resolvers explicitly:
# MONGODB_DNS_SERVERS=8.8.8.8,8.8.4.4
```

If it still fails, replace `mongodb+srv://…` with Atlas’s **standard** connection
string (`mongodb://host1:27017,host2:27017/...`) from **Connect → Drivers**.

## Architecture

- `server.js` → `connectMongo()` then `runStartupMigrations()`
- Routes → `lib/store.js` → `mongo-store` or `data-store`
- `mongo-store` loads all collections into one in-memory snapshot per
  `readDb()` / `withDb()` — same pattern as the JSON file, so no route changes

To stay on the file DB, omit `USE_MONGO` or set `USE_MONGO=false`.
