import { useEffect } from "react";
import "./OrderActionDialog.css";

function formatMoney(n) {
  return Number(n || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

function formatDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const STATUS_LABEL = {
  processing: "Processing",
  transit: "In Transit",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

/**
 * Two-mode dialog:
 *   - mode="track"  → shows the order's `timeline` from the backend.
 *   - mode="details" → shows the full line items + address + totals.
 *
 * Closes on backdrop click and Escape. The backend already attaches
 * `timeline` to every order (see `lib/order-lifecycle.js`), so this
 * component only renders.
 */
export default function OrderActionDialog({ order, mode, onClose }) {
  useEffect(() => {
    if (!order) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [order, onClose]);

  if (!order) return null;

  const title = mode === "track" ? "Track Package" : "Order Details";
  const subtitle = `Order #${order.id} • ${STATUS_LABEL[order.status] || "Processing"}`;

  return (
    <div className="oad-overlay" role="presentation" onClick={onClose}>
      <div
        className="oad-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="oad-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="oad-head">
          <div>
            <h2 id="oad-title" className="oad-title">{title}</h2>
            <p className="oad-subtitle">{subtitle}</p>
          </div>
          <button
            type="button"
            className="oad-close"
            onClick={onClose}
            aria-label="Close dialog"
          >
            ×
          </button>
        </header>

        <div className="oad-body">
          {mode === "track" ? (
            <ol className="oad-timeline">
              {(order.timeline || []).map((stage, idx) => (
                <li
                  key={`${stage.label}-${idx}`}
                  className={
                    stage.cancelled
                      ? "oad-step oad-step--cancelled"
                      : stage.done
                        ? "oad-step oad-step--done"
                        : "oad-step"
                  }
                >
                  <span className="oad-step-dot" aria-hidden="true" />
                  <div className="oad-step-body">
                    <p className="oad-step-label">{stage.label}</p>
                    <p className="oad-step-time">{formatDateTime(stage.at)}</p>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <>
              <section className="oad-section">
                <h3 className="oad-section-head">Items ({order.items?.length || 0})</h3>
                <ul className="oad-item-list">
                  {(order.items || []).map((it) => (
                    <li key={it.productId} className="oad-item">
                      <div className="oad-item-thumb">
                        {it.image ? <img src={it.image} alt="" /> : null}
                      </div>
                      <div className="oad-item-meta">
                        <p className="oad-item-title">{it.title}</p>
                        {it.subtitle ? (
                          <p className="oad-item-sub">{it.subtitle}</p>
                        ) : null}
                        <p className="oad-item-qty">
                          Qty {it.quantity} · {formatMoney(it.unitPrice)} each
                        </p>
                      </div>
                      <span className="oad-item-total">{formatMoney(it.lineTotal)}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="oad-section oad-section--totals">
                <div className="oad-total-row">
                  <span>Subtotal</span>
                  <span>{formatMoney(order.subtotal)}</span>
                </div>
                <div className="oad-total-row">
                  <span>Tax</span>
                  <span>{formatMoney(order.tax)}</span>
                </div>
                <div className="oad-total-row oad-total-row--grand">
                  <span>Total</span>
                  <span>{formatMoney(order.total)}</span>
                </div>
              </section>

              {order.address ? (
                <section className="oad-section">
                  <h3 className="oad-section-head">Shipping to</h3>
                  <address className="oad-address">
                    {order.address.fullName}<br />
                    {order.address.line1}<br />
                    {order.address.city}, {order.address.postal}
                  </address>
                </section>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
