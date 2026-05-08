/**
 * Order status helpers.
 *
 * Stored orders only ever live in the file db with `status: "processing"`
 * (or `"cancelled"` after a successful cancel). The visible status that the
 * UI shows is computed from `createdAt` — orders progress on a fixed
 * timeline so the demo feels alive without a real fulfilment system. A
 * cancelled order is sticky and never advances.
 */

const HOURS = 60 * 60 * 1000;

const PROGRESSION = [
  { status: "processing", afterMs: 0 },
  { status: "transit", afterMs: 24 * HOURS },
  { status: "delivered", afterMs: 72 * HOURS },
];

function effectiveStatus(order) {
  if (!order || typeof order !== "object") return "processing";
  if (order.status === "cancelled") return "cancelled";

  const created = Date.parse(order.createdAt);
  if (!Number.isFinite(created)) return order.status || "processing";

  const age = Date.now() - created;
  let current = "processing";
  for (const stage of PROGRESSION) {
    if (age >= stage.afterMs) current = stage.status;
  }
  return current;
}

/**
 * Returns a fixed, deterministic timeline used by the "Track Package" view.
 * Each entry has { label, at, done }. `at` is an ISO string so the FE can
 * render it the same way it formats createdAt.
 */
function trackingTimeline(order) {
  if (!order) return [];
  const created = Date.parse(order.createdAt);
  if (!Number.isFinite(created)) return [];

  const stages = [
    { label: "Order placed", at: new Date(created).toISOString() },
    { label: "Preparing for shipment", at: new Date(created + 6 * HOURS).toISOString() },
    { label: "Out for delivery", at: new Date(created + 24 * HOURS).toISOString() },
    { label: "Delivered", at: new Date(created + 72 * HOURS).toISOString() },
  ];

  if (order.status === "cancelled") {
    return [
      stages[0],
      {
        label: "Cancelled",
        at: order.updatedAt || stages[0].at,
        done: true,
        cancelled: true,
      },
    ];
  }

  const now = Date.now();
  return stages.map((stage) => ({
    ...stage,
    done: Date.parse(stage.at) <= now,
  }));
}

/**
 * Decorate an order with the computed `status` and `timeline` so the FE
 * doesn't have to know the rules. The original stored fields (`status`)
 * stay readable as `storedStatus`.
 */
function decorateOrder(order) {
  if (!order) return order;
  return {
    ...order,
    storedStatus: order.status,
    status: effectiveStatus(order),
    timeline: trackingTimeline(order),
  };
}

module.exports = {
  effectiveStatus,
  trackingTimeline,
  decorateOrder,
};
