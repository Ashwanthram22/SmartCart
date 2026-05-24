/**
 * Order status helpers.
 *
 * - `order.status` in the database is the source of truth when an admin (or
 *   cancel flow) sets `transit`, `delivered`, or `cancelled`.
 * - While status stays `processing`, the visible status auto-advances on a
 *   fixed timeline (demo fulfilment) so older orders feel alive.
 */

const HOURS = 60 * 60 * 1000;

const PROGRESSION = [
  { status: "processing", afterMs: 0 },
  { status: "transit", afterMs: 24 * HOURS },
  { status: "delivered", afterMs: 72 * HOURS },
];

const STICKY_STATUSES = new Set(["cancelled", "transit", "delivered"]);

function storedStatus(order) {
  return String(order?.status || "processing").toLowerCase();
}

function autoStatusFromAge(order) {
  const created = Date.parse(order.createdAt);
  if (!Number.isFinite(created)) return "processing";

  const age = Date.now() - created;
  let current = "processing";
  for (const stage of PROGRESSION) {
    if (age >= stage.afterMs) current = stage.status;
  }
  return current;
}

function effectiveStatus(order) {
  if (!order || typeof order !== "object") return "processing";

  const stored = storedStatus(order);
  if (STICKY_STATUSES.has(stored)) return stored;

  // Only auto-progress orders still marked processing in the DB.
  return autoStatusFromAge(order);
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
    {
      label: "Delivered",
      at: order.deliveredAt || new Date(created + 72 * HOURS).toISOString(),
    },
  ];

  const live = effectiveStatus(order);

  if (live === "cancelled") {
    return [
      stages[0],
      {
        label: "Cancelled",
        at: order.cancelledAt || order.updatedAt || stages[0].at,
        done: true,
        cancelled: true,
      },
    ];
  }

  if (live === "delivered") {
    return stages.map((stage) => ({ ...stage, done: true }));
  }

  if (live === "transit") {
    return stages.map((stage, index) => ({
      ...stage,
      done: index < 3,
    }));
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
