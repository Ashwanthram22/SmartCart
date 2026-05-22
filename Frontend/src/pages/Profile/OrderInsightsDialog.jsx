import { useEffect, useMemo, useRef } from "react";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import { formatMoney } from "../../utils/money";
import { computeInsights } from "../../utils/orderInsights";
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
