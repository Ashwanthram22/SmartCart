import { useEffect, useMemo, useRef } from "react";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import { formatMoney } from "../../utils/money";
import "./OrderInsightsDialog.css";

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const STATUS_LABEL = {
  processing: "Processing",
  transit: "In transit",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

/**
 * Compute insights from the user's actual order history. Everything is
 * derived client-side from the orders the page already has, so the report
 * stays consistent with what's visible on the cards above and we don't
 * need a new backend route.
 */
function computeInsights(orders) {
  const total = orders.length;
  const validForSpend = orders.filter((o) => o.status !== "cancelled");
  const totalSpent = validForSpend.reduce((s, o) => s + Number(o.total || 0), 0);
  const itemsPurchased = validForSpend.reduce(
    (s, o) => s + (o.items || []).reduce((ss, it) => ss + Number(it.quantity || 0), 0),
    0
  );
  const avgOrder = validForSpend.length ? totalSpent / validForSpend.length : 0;

  const byStatus = orders.reduce((acc, o) => {
    const key = o.status || "processing";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  // Top products by quantity bought across all orders.
  const productCounts = new Map();
  for (const order of validForSpend) {
    for (const item of order.items || []) {
      const key = item.title || item.productId;
      if (!key) continue;
      const prior = productCounts.get(key) || { title: key, qty: 0, total: 0 };
      prior.qty += Number(item.quantity || 0);
      prior.total += Number(item.lineTotal || 0);
      productCounts.set(key, prior);
    }
  }
  const topProducts = Array.from(productCounts.values())
    .sort((a, b) => b.qty - a.qty || b.total - a.total)
    .slice(0, 5);

  const sortedByDate = [...orders].sort(
    (a, b) => (Date.parse(a.createdAt) || 0) - (Date.parse(b.createdAt) || 0)
  );
  const firstOrder = sortedByDate[0] || null;
  const lastOrder = sortedByDate[sortedByDate.length - 1] || null;

  return {
    total,
    totalSpent,
    itemsPurchased,
    avgOrder,
    byStatus,
    topProducts,
    firstOrder,
    lastOrder,
  };
}

/**
 * Modal that summarises the user's actual order history into a few useful
 * stats. Replaces the previous "View Full Report" button that did nothing.
 */
export default function OrderInsightsDialog({ orders, onClose }) {
  const dialogRef = useRef(null);
  useFocusTrap(dialogRef, true);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const stats = useMemo(() => computeInsights(orders || []), [orders]);

  return (
    <div className="oid-overlay" role="presentation" onClick={onClose}>
      <div
        ref={dialogRef}
        className="oid-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="oid-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="oid-head">
          <div>
            <p className="oid-eyebrow">Smart Insight</p>
            <h2 id="oid-title" className="oid-title">Your spending pattern</h2>
          </div>
          <button
            type="button"
            className="oid-close"
            onClick={onClose}
            aria-label="Close report"
          >
            ×
          </button>
        </header>

        <div className="oid-body">
          <div className="oid-stat-grid">
            <div className="oid-stat">
              <span className="oid-stat-label">Total Orders</span>
              <span className="oid-stat-value">{stats.total}</span>
            </div>
            <div className="oid-stat">
              <span className="oid-stat-label">Total Spent</span>
              <span className="oid-stat-value">{formatMoney(stats.totalSpent)}</span>
            </div>
            <div className="oid-stat">
              <span className="oid-stat-label">Items Bought</span>
              <span className="oid-stat-value">{stats.itemsPurchased}</span>
            </div>
            <div className="oid-stat">
              <span className="oid-stat-label">Avg Order</span>
              <span className="oid-stat-value">{formatMoney(stats.avgOrder)}</span>
            </div>
          </div>

          <section className="oid-section">
            <h3 className="oid-section-head">Status breakdown</h3>
            <ul className="oid-status-list">
              {Object.entries(stats.byStatus).map(([status, count]) => (
                <li
                  key={status}
                  className={`oid-status-item oid-status-item--${status}`}
                >
                  {STATUS_LABEL[status] || status}
                  <span className="oid-status-count">{count}</span>
                </li>
              ))}
            </ul>
          </section>

          {stats.topProducts.length > 0 ? (
            <section className="oid-section">
              <h3 className="oid-section-head">Most-bought products</h3>
              <ol className="oid-rank">
                {stats.topProducts.map((p, idx) => (
                  <li key={p.title} className="oid-rank-item">
                    <span className="oid-rank-num">{idx + 1}</span>
                    <span className="oid-rank-label">{p.title}</span>
                    <span className="oid-rank-meta">
                      {p.qty} × · {formatMoney(p.total)}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          <section className="oid-section oid-section--meta">
            {stats.firstOrder ? (
              <p className="oid-meta-row">
                <span>First order</span>
                <strong>{formatDate(stats.firstOrder.createdAt)}</strong>
              </p>
            ) : null}
            {stats.lastOrder && stats.firstOrder?.id !== stats.lastOrder?.id ? (
              <p className="oid-meta-row">
                <span>Most recent order</span>
                <strong>{formatDate(stats.lastOrder.createdAt)}</strong>
              </p>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}
