/**
 * Build docs/collections/auditLogs/auditLogs.json — demo admin activity
 * aligned with products.json + orders.json seed ids.
 *
 * Usage: node scripts/generate-audit-logs-seed.js
 */
const fs = require("fs");
const path = require("path");

const ACTOR = { actorId: "u-admin", actorEmail: "admin@aicart.com" };

/** @type {{ id: string; ts: string; action: string; target: { type: string; id: string | null }; summary: string; changes?: object; meta?: object }[]} */
const ENTRIES = [
  {
    id: "log-seed-001",
    ts: "2026-05-10T09:00:00.000Z",
    action: "product.update",
    target: { type: "product", id: "el1001" },
    summary: "Updated Sony WH-1000XM5 Headphones (stock)",
    changes: { stock: { from: 42, to: 34 } },
  },
  {
    id: "log-seed-002",
    ts: "2026-05-10T11:30:00.000Z",
    action: "product.update",
    target: { type: "product", id: "mb1001" },
    summary: "Updated iPhone 16 Pro Max (price)",
    changes: { price: { from: 154999, to: 149999 } },
  },
  {
    id: "log-seed-003",
    ts: "2026-05-11T08:15:00.000Z",
    action: "order.status",
    target: { type: "order", id: "o-seed-priya-001" },
    summary: "Order o-seed-priya-001 marked transit",
    changes: { status: { from: "processing", to: "transit" } },
  },
  {
    id: "log-seed-004",
    ts: "2026-05-11T14:00:00.000Z",
    action: "product.update",
    target: { type: "product", id: "hk1001" },
    summary: "Updated Philips Air Fryer HD9252 (stock)",
    changes: { stock: { from: 52, to: 47 } },
  },
  {
    id: "log-seed-005",
    ts: "2026-05-12T10:00:00.000Z",
    action: "product.update",
    target: { type: "product", id: "ac1001" },
    summary: "Updated Logitech MX Master 3S Mouse (stock)",
    changes: { stock: { from: 55, to: 48 } },
  },
  {
    id: "log-seed-006",
    ts: "2026-05-12T16:45:00.000Z",
    action: "order.status",
    target: { type: "order", id: "o-seed-vikram-001" },
    summary: "Order o-seed-vikram-001 marked delivered",
    changes: { status: { from: "transit", to: "delivered" } },
  },
  {
    id: "log-seed-007",
    ts: "2026-05-13T09:20:00.000Z",
    action: "product.update",
    target: { type: "product", id: "el1001" },
    summary: "Updated Sony WH-1000XM5 Headphones (stock)",
    changes: { stock: { from: 34, to: 28 } },
  },
  {
    id: "log-seed-008",
    ts: "2026-05-13T13:47:00.000Z",
    action: "product.update",
    target: { type: "product", id: "lp1001" },
    summary: "Updated Apple MacBook Pro M4 (stock)",
    changes: { stock: { from: 28, to: 22 } },
  },
  {
    id: "log-seed-009",
    ts: "2026-05-14T10:30:00.000Z",
    action: "order.status",
    target: { type: "order", id: "o-seed-rahul-001" },
    summary: "Order o-seed-rahul-001 marked delivered",
    changes: { status: { from: "processing", to: "delivered" } },
  },
  {
    id: "log-seed-010",
    ts: "2026-05-15T11:00:00.000Z",
    action: "product.update",
    target: { type: "product", id: "fa1001" },
    summary: "Updated Nike Air Force 1 '07 (stock)",
    changes: { stock: { from: 90, to: 84 } },
  },
  {
    id: "log-seed-011",
    ts: "2026-05-16T08:00:00.000Z",
    action: "order.bulk-status",
    target: { type: "order", id: null },
    summary: "Bulk-updated 2 orders → transit",
    meta: {
      status: "transit",
      ids: ["o-seed-ananya-001", "o-seed-rahul-002"],
      missing: [],
    },
  },
  {
    id: "log-seed-012",
    ts: "2026-05-17T15:20:00.000Z",
    action: "order.status",
    target: { type: "order", id: "o-seed-sneha-001" },
    summary: "Order o-seed-sneha-001 marked cancelled",
    changes: { status: { from: "processing", to: "cancelled" } },
  },
  {
    id: "log-seed-013",
    ts: "2026-05-18T09:45:00.000Z",
    action: "product.update",
    target: { type: "product", id: "el1003" },
    summary: "Updated Apple AirPods Pro 2 (price, stock)",
    changes: {
      price: { from: 25999, to: 24999 },
      stock: { from: 70, to: 67 },
    },
  },
  {
    id: "log-seed-014",
    ts: "2026-05-19T12:00:00.000Z",
    action: "order.status",
    target: { type: "order", id: "o-seed-priya-002" },
    summary: "Order o-seed-priya-002 marked transit",
    changes: { status: { from: "processing", to: "transit" } },
  },
  {
    id: "log-seed-015",
    ts: "2026-05-20T10:31:00.000Z",
    action: "order.status",
    target: { type: "order", id: "o-seed-rahul-003" },
    summary: "Order o-seed-rahul-003 marked processing",
    changes: { status: { from: "cancelled", to: "processing" } },
  },
  {
    id: "log-seed-016",
    ts: "2026-05-20T14:00:00.000Z",
    action: "product.update",
    target: { type: "product", id: "gr1001" },
    summary: "Updated India Gate Basmati Rice (stock)",
    changes: { stock: { from: 125, to: 120 } },
  },
];

function main() {
  const outPath = path.join(
    __dirname,
    "../docs/collections/auditLogs/auditLogs.json"
  );

  const logs = ENTRIES.map((e) => ({
    ...e,
    ...ACTOR,
  })).sort((a, b) => Date.parse(b.ts) - Date.parse(a.ts));

  fs.writeFileSync(outPath, `${JSON.stringify(logs, null, 2)}\n`, "utf8");
  console.log(`Wrote ${logs.length} audit logs → ${outPath}`);
}

main();
