import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Download,
  Filter,
  RotateCw,
  Truck,
} from "lucide-react";
import { ProfileLayout } from "./ProfileLayout";
import OrderActionDialog from "./OrderActionDialog";
import { cancelOrder, getOrders } from "../../api/client";
import { useCart } from "../../hooks/useCart";
import { useToast } from "../../hooks/useToast";
import "./OrderHistory.css";

function StatusBadge({ status }) {
  if (status === "transit") {
    return (
      <div className="oh-badge oh-badge--transit">
        <Truck size={14} aria-hidden="true" />
        In Transit
      </div>
    );
  }
  if (status === "delivered") {
    return (
      <div className="oh-badge oh-badge--delivered">
        <CheckCircle2 size={14} aria-hidden="true" />
        Delivered
      </div>
    );
  }
  if (status === "cancelled") {
    return (
      <div className="oh-badge oh-badge--cancelled">
        <AlertCircle size={14} aria-hidden="true" />
        Cancelled
      </div>
    );
  }
  return (
    <div className="oh-badge oh-badge--processing">
      <RotateCw size={14} aria-hidden="true" />
      Processing
    </div>
  );
}

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

function formatMoney(n) {
  return Number(n || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

function actionsFor(status) {
  if (status === "cancelled") {
    return [{ id: "details", label: "View Details", variant: "outline" }];
  }
  if (status === "transit") {
    return [
      { id: "track", label: "Track Package", variant: "primary" },
      { id: "details", label: "View Details", variant: "outline" },
    ];
  }
  if (status === "delivered") {
    return [
      { id: "buyAgain", label: "Buy Again", variant: "outline" },
      { id: "details", label: "View Details", variant: "outline" },
    ];
  }
  return [
    { id: "track", label: "Track", variant: "outline" },
    { id: "details", label: "View Details", variant: "outline" },
    { id: "cancel", label: "Cancel", variant: "danger-outline" },
  ];
}

export default function OrderHistory() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dialogOrder, setDialogOrder] = useState(null);
  const [dialogMode, setDialogMode] = useState(null); // "track" | "details"
  const [busyOrderId, setBusyOrderId] = useState(null);

  const { addItem } = useCart();
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await getOrders();
        if (!cancelled) setOrders(Array.isArray(data?.orders) ? data.orders : []);
      } catch {
        if (!cancelled) setError("Could not load your order history.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const isEmpty = !loading && orders.length === 0;

  const cards = useMemo(
    () =>
      orders.map((order) => {
        const headline = order.items?.[0];
        const restCount = Math.max(0, (order.items?.length || 0) - 1);
        return {
          ...order,
          headline,
          extraLine:
            restCount > 0
              ? `+ ${restCount} more item${restCount > 1 ? "s" : ""} in this order`
              : null,
          actions: actionsFor(order.status),
        };
      }),
    [orders]
  );

  /**
   * Re-queue every line of a previous order into the live cart. Reuses the
   * existing `addItem` rules (stock cap, dedupe by productId), so re-buying
   * a sold-out SKU silently degrades to "added what we could" rather than
   * throwing. We then route to the cart so the user can review before
   * checking out.
   */
  const handleBuyAgain = (order) => {
    let added = 0;
    let skipped = 0;
    (order.items || []).forEach((line) => {
      const ok = addItem({
        productId: line.productId,
        title: line.title,
        image: line.image,
        subtitle: line.subtitle,
        unitPrice: line.unitPrice,
        quantity: line.quantity,
      });
      if (ok) added += 1;
      else skipped += 1;
    });

    if (added === 0) {
      toast.error("Nothing from this order is available right now.");
      return;
    }
    if (skipped > 0) {
      toast.info(`Added ${added} of ${added + skipped} items to your cart.`);
    } else {
      toast.success(`${added} item${added > 1 ? "s" : ""} added to your cart.`);
    }
    navigate("/cart");
  };

  const handleCancel = async (order) => {
    const confirmed = window.confirm(
      `Cancel order #${order.id}?\nThis cannot be undone.`
    );
    if (!confirmed) return;

    setBusyOrderId(order.id);
    try {
      const res = await cancelOrder(order.id);
      const updated = res?.order;
      if (updated) {
        setOrders((prev) =>
          prev.map((o) => (o.id === updated.id ? updated : o))
        );
      }
      toast.success("Order cancelled.");
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Could not cancel this order."
      );
    } finally {
      setBusyOrderId(null);
    }
  };

  const dispatch = (action, order) => {
    if (action.id === "track") {
      setDialogOrder(order);
      setDialogMode("track");
      return;
    }
    if (action.id === "details") {
      setDialogOrder(order);
      setDialogMode("details");
      return;
    }
    if (action.id === "buyAgain") {
      handleBuyAgain(order);
      return;
    }
    if (action.id === "cancel") {
      handleCancel(order);
    }
  };

  return (
    <ProfileLayout>
      <div className="order-history">
        <div className="oh-page-head">
          <div>
            <h1 className="oh-title">Order History</h1>
            <p className="oh-subtitle">
              Manage and track your recent SmartCart AI assisted purchases.
            </p>
          </div>
          <div className="oh-toolbar">
            <button type="button" className="oh-tool-btn" disabled title="Coming soon">
              <Filter size={18} aria-hidden="true" className="oh-btn-icon" />
              Filter
            </button>
            <button type="button" className="oh-tool-btn" disabled title="Coming soon">
              <Download size={18} aria-hidden="true" className="oh-btn-icon" />
              Export
            </button>
          </div>
        </div>

        {error ? <p className="oh-error">{error}</p> : null}

        <div className="oh-card-list">
          {loading ? (
            <article className="oh-order-card oh-order-card--skeleton" aria-busy="true">
              Loading your orders…
            </article>
          ) : isEmpty ? (
            <article className="oh-order-card oh-empty-card">
              <h2 className="oh-product-title">No orders yet</h2>
              <p className="oh-product-sub">
                Once you place your first order it will show up here with
                tracking and reorder options.
              </p>
              <div className="oh-order-actions">
                <Link
                  to="/catalog/products"
                  className="oh-action-btn oh-action-btn--primary"
                >
                  Browse products
                </Link>
              </div>
            </article>
          ) : (
            cards.map((order) => (
              <article key={order.id} className="oh-order-card">
                <div className="oh-order-meta-bar">
                  <div className="oh-order-meta-grid">
                    <div>
                      <p className="oh-meta-label">Order Placed</p>
                      <p className="oh-meta-value">{formatDate(order.createdAt)}</p>
                    </div>
                    <div>
                      <p className="oh-meta-label">Total</p>
                      <p className="oh-meta-value oh-meta-value--bold">
                        {formatMoney(order.total)}
                      </p>
                    </div>
                    <div>
                      <p className="oh-meta-label">Order #</p>
                      <p className="oh-meta-value">{order.id}</p>
                    </div>
                  </div>
                  <StatusBadge status={order.status} />
                </div>

                <div className="oh-order-body">
                  <div className="oh-order-thumb">
                    {order.headline?.image ? (
                      <img src={order.headline.image} alt="" loading="lazy" />
                    ) : null}
                  </div>
                  <div className="oh-order-main">
                    <div>
                      <h2 className="oh-product-title">
                        {order.headline?.title || "Order"}
                      </h2>
                      <p className="oh-product-sub">
                        {order.headline?.subtitle || ""}
                      </p>
                      {order.extraLine ? (
                        <p className="oh-product-extra">{order.extraLine}</p>
                      ) : null}
                      {order.address ? (
                        <p className="oh-product-note">
                          Shipping to {order.address.fullName} ·{" "}
                          {order.address.city}
                        </p>
                      ) : null}
                    </div>
                    <div className="oh-order-actions">
                      {order.actions.map((a) => (
                        <button
                          key={a.id}
                          type="button"
                          disabled={busyOrderId === order.id && a.id === "cancel"}
                          className={
                            a.variant === "primary"
                              ? "oh-action-btn oh-action-btn--primary"
                              : a.variant === "danger-outline"
                                ? "oh-action-btn oh-action-btn--danger"
                                : "oh-action-btn oh-action-btn--outline"
                          }
                          onClick={() => dispatch(a, order)}
                        >
                          {busyOrderId === order.id && a.id === "cancel"
                            ? "Cancelling…"
                            : a.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>

        <section className="oh-insight" aria-labelledby="oh-insight-heading">
          <div className="oh-insight-glow" aria-hidden="true" />
          <div className="oh-insight-inner">
            <div className="oh-insight-icon-wrap">
              <BarChart3 size={32} aria-hidden="true" />
            </div>
            <div className="oh-insight-copy">
              <h3 id="oh-insight-heading" className="oh-insight-title">
                Smart Insight: Spending Pattern
              </h3>
              <p className="oh-insight-text">
                Based on your history, your shopping efficiency has improved by{" "}
                <strong className="oh-insight-highlight">14%</strong> this
                month. You&apos;ve saved an average of{" "}
                <strong className="oh-insight-highlight">$42</strong> per order
                using AI-negotiated deals.
              </p>
            </div>
            <button type="button" className="oh-insight-cta" disabled title="Coming soon">
              View Full Report
            </button>
          </div>
        </section>

        <footer className="oh-footer">
          <div className="oh-footer-inner">
            <div>
              <span className="oh-footer-brand">SmartCart AI</span>
              <p className="oh-footer-copy">
                © 2024 SmartCart AI. Intelligent shopping for the future.
              </p>
            </div>
            <div className="oh-footer-links">
              <a href="/profile">Privacy Policy</a>
              <a href="/profile">Terms of Service</a>
              <a href="/profile">Help Center</a>
              <a href="/profile">Contact</a>
            </div>
          </div>
        </footer>
      </div>

      {dialogOrder ? (
        <OrderActionDialog
          order={dialogOrder}
          mode={dialogMode}
          onClose={() => setDialogOrder(null)}
        />
      ) : null}
    </ProfileLayout>
  );
}
