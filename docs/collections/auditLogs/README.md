# `auditLogs` collection

Append-only **admin audit trail** when products or orders change via `/api/admin`.

**Base path:** `/api/admin/audit`  
**Auth:** Admin JWT — `Authorization: Bearer <admin_jwt>`

Rows are **written automatically** by admin routes (no public POST to create logs).

---

## MongoDB document (stored)

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
    "stock": {
      "from": 31,
      "to": 1
    }
  }
}
```

### Example — order status change

```json
{
  "id": "log-1778681000000-abc123",
  "ts": "2026-05-14T10:00:00.000Z",
  "actorId": "u-admin",
  "actorEmail": "admin@aicart.com",
  "action": "order.status",
  "target": {
    "type": "order",
    "id": "o1778574632318"
  },
  "summary": "Order o1778574632318 marked delivered",
  "changes": {
    "status": {
      "from": "processing",
      "to": "delivered"
    }
  }
}
```

---

## `GET /api/admin/audit`

### Request (query string)

```
GET /api/admin/audit?action=product&actor=admin@aicart.com&q=p15&limit=20&offset=0
```

| Param | Example | Purpose |
|-------|---------|---------|
| `action` | `product` | Substring on `action` |
| `actor` | `admin` | Match email or actor id |
| `q` | `p15` | Search summary / action / target id |
| `since` | `2026-05-13T00:00:00.000Z` | From date |
| `until` | `2026-05-14T23:59:59.000Z` | To date |
| `limit` | `20` | Page size (max 500) |
| `offset` | `0` | Skip rows |

### Response `200`

```json
{
  "entries": [
    {
      "id": "log-1778680371828-4dtujn",
      "ts": "2026-05-13T13:52:51.828Z",
      "actorId": "u-admin",
      "actorEmail": "admin@aicart.com",
      "action": "product.update",
      "target": {
        "type": "product",
        "id": "p15"
      },
      "summary": "Updated UltraTab 12\" Tablet (stock)",
      "changes": {
        "stock": {
          "from": 21,
          "to": 11
        }
      }
    },
    {
      "id": "log-1778680295558-xmjvcq",
      "ts": "2026-05-13T13:51:35.558Z",
      "actorId": "u-admin",
      "actorEmail": "admin@aicart.com",
      "action": "product.update",
      "target": {
        "type": "product",
        "id": "p15"
      },
      "summary": "Updated UltraTab 12\" Tablet (stock)",
      "changes": {
        "stock": {
          "from": 1,
          "to": 21
        }
      }
    }
  ],
  "total": 2,
  "limit": 20,
  "offset": 0
}
```

### Empty result

```json
{
  "entries": [],
  "total": 0,
  "limit": 100,
  "offset": 0
}
```

---

## Routes that write this collection

| Admin route | Typical `action` |
|-------------|------------------|
| `POST /api/admin/products` | `product.create` |
| `PATCH /api/admin/products/:id` | `product.update` |
| `DELETE /api/admin/products/:id` | `product.delete` |
| `PATCH /api/admin/orders/:id/status` | `order.status` |
| `POST /api/admin/orders/bulk-status` | `order.status` (per order) |

---

## Mongo import

**16** seed rows for Admin → Activity: [auditLogs.json](./auditLogs.json) — see [MONGO_IMPORT.md](./MONGO_IMPORT.md).

Regenerate: `node scripts/generate-audit-logs-seed.js`

---

## Code

- `Backend/src/routes/admin.routes.js`
- `Backend/src/lib/audit.js`
