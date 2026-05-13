import { useEffect, useMemo, useRef, useState } from "react";
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
import OrderInsightsDialog from "./OrderInsightsDialog";
import { cancelOrder, getOrders } from "../../api/client";
import { useCart } from "../../hooks/useCart";
import { useToast } from "../../hooks/useToast";
import usePageMeta from "../../hooks/usePageMeta";
import Skeleton from "../../components/Skeleton";
import { formatMoney } from "../../utils/money";
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

const FILTER_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "processing", label: "Processing" },
  { value: "transit", label: "In transit" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

/** RFC 4180-ish CSV escape: wrap in quotes and double up internal quotes. */
function csvCell(value) {
  if (value == null) return "";
  const s = String(value).replace(/"/g, '""');
  if (/[",\n\r]/.test(s)) return `"${s}"`;
  return s;
}

/**
 * Build a CSV blob of the user's orders (one row per line item, so the
 * download is useful for spreadsheets / accounting). Triggers the browser
 * download via an anchor click — purely client-side, no backend needed.
 */
function downloadOrdersCsv(orders) {
  const header = [
    "Order ID",
    "Order Date",
    "Status",
    "Product",
    "Quantity",
    "Unit Price (INR)",
    "Line Total (INR)",
    "Order Subtotal",
    "Order Tax",
    "Order Total",
    "Ship To",
    "City",
    "Postal",
  ];

  const rows = [header];
  for (const order of orders) {
    const items = order.items?.length ? order.items : [{}];
    for (const item of items) {
      rows.push([
        order.id,
        order.createdAt,
        order.status,
        item.title || "",
        item.quantity ?? "",
        item.unitPrice ?? "",
        item.lineTotal ?? "",
        order.subtotal,
        order.tax,
        order.total,
        order.address?.fullName || "",
        order.address?.city || "",
        order.address?.postal || "",
      ]);
    }
  }

  const csv = rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `smartcart-orders-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
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
  usePageMeta({
    title: "Order history",
    description: "Track every SmartCart AI order, download invoices and re-buy in one tap.",
  });

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dialogOrder, setDialogOrder] = useState(null);
  const [dialogMode, setDialogMode] = useState(null); // "track" | "details"
  const [busyOrderId, setBusyOrderId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [insightsOpen, setInsightsOpen] = useState(false);
  const filterMenuRef = useRef(null);

  const { addItem } = useCart();
  const toast = useToast();
  const navigate = useNavigate();

  // Close the filter menu on outside click + Escape.
  useEffect(() => {
    if (!filterMenuOpen) return undefined;
    const onDown = (e) => {
      if (!filterMenuRef.current) return;
      if (!filterMenuRef.current.contains(e.target)) setFilterMenuOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setFilterMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [filterMenuOpen]);

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

  const filteredOrders = useMemo(
    () =>
      statusFilter === "all"
        ? orders
        : orders.filter((o) => o.status === statusFilter),
    [orders, statusFilter]
  );

  const isEmpty = !loading && filteredOrders.length === 0;

  const cards = useMemo(
    () =>
      filteredOrders.map((order) => {
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
    [filteredOrders]
  );

  const activeFilterLabel =
    FILTER_OPTIONS.find((o) => o.value === statusFilter)?.label || "All statuses";

  const handleExport = () => {
    if (orders.length === 0) {
      toast.info("No orders to export yet.");
      return;
    }
    downloadOrdersCsv(orders);
    toast.success(`Exported ${orders.length} order${orders.length === 1 ? "" : "s"} to CSV.`);
  };

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
            <div className="oh-filter" ref={filterMenuRef}>
              <button
                type="button"
                className={
                  statusFilter === "all"
                    ? "oh-tool-btn"
                    : "oh-tool-btn oh-tool-btn--active"
                }
                aria-haspopup="listbox"
                aria-expanded={filterMenuOpen}
                onClick={() => setFilterMenuOpen((v) => !v)}
              >
                <Filter size={18} aria-hidden="true" className="oh-btn-icon" />
                {activeFilterLabel}
              </button>
              {filterMenuOpen ? (
                <ul className="oh-filter-menu" role="listbox">
                  {FILTER_OPTIONS.map((opt) => (
                    <li key={opt.value}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={statusFilter === opt.value}
                        className={
                          statusFilter === opt.value
                            ? "oh-filter-option oh-filter-option--active"
                            : "oh-filter-option"
                        }
                        onClick={() => {
                          setStatusFilter(opt.value);
                          setFilterMenuOpen(false);
                        }}
                      >
                        {opt.label}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            <button
              type="button"
              className="oh-tool-btn"
              onClick={handleExport}
              disabled={orders.length === 0}
              title={orders.length === 0 ? "No orders to export yet" : "Download as CSV"}
            >
              <Download size={18} aria-hidden="true" className="oh-btn-icon" />
              Export
            </button>
          </div>
        </div>

        {error ? <p className="oh-error">{error}</p> : null}

        <div className="oh-card-list">
          {loading ? (
            <>
              {Array.from({ length: 3 }).map((_, i) => (
                <article
                  key={i}
                  className="oh-order-card oh-order-card--skeleton"
                  aria-busy="true"
                  aria-label="Loading order"
                >
                  <div className="oh-skel-row">
                    <Skeleton height={20} width={150} radius={6} />
                    <Skeleton height={20} width={90} radius={999} />
                  </div>
                  <div className="oh-skel-body">
                    <Skeleton height={88} width={88} radius={12} />
                    <div className="oh-skel-text">
                      <Skeleton height={18} width="60%" radius={4} />
                      <Skeleton height={14} width="40%" radius={4} className="oh-skel-mt-8" />
                      <Skeleton height={14} width="30%" radius={4} className="oh-skel-mt-8" />
                    </div>
                    <Skeleton height={28} width={90} radius={6} />
                  </div>
                  <div className="oh-skel-actions">
                    <Skeleton height={36} width={120} radius={8} />
                    <Skeleton height={36} width={120} radius={8} />
                  </div>
                </article>
              ))}
            </>
          ) : isEmpty ? (
            statusFilter !== "all" ? (
              <article className="oh-order-card oh-empty-card">
                <h2 className="oh-product-title">No {activeFilterLabel.toLowerCase()} orders</h2>
                <p className="oh-product-sub">
                  Try a different filter to see more of your history.
                </p>
                <div className="oh-order-actions">
                  <button
                    type="button"
                    className="oh-action-btn oh-action-btn--primary"
                    onClick={() => setStatusFilter("all")}
                  >
                    Show all orders
                  </button>
                </div>
              </article>
            ) : (
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
            )
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
                <strong className="oh-insight-highlight">₹2,499</strong> per order
                using AI-negotiated deals.
              </p>
            </div>
            <button
              type="button"
              className="oh-insight-cta"
              onClick={() => setInsightsOpen(true)}
              disabled={orders.length === 0}
              title={orders.length === 0 ? "Place an order to unlock the report" : ""}
            >
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

      {insightsOpen ? (
        <OrderInsightsDialog
          orders={orders}
          onClose={() => setInsightsOpen(false)}
        />
      ) : null}
    </ProfileLayout>
  );
}
