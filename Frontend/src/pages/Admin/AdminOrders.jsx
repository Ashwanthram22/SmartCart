import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  CircleDashed,
  Filter,
  PackageCheck,
  Search,
  Truck,
  XCircle,
} from "lucide-react";
import AdminLayout from "./AdminLayout";
import { adminListOrders, adminUpdateOrderStatus } from "../../api/client";
import { useToast } from "../../hooks/useToast";
import usePageMeta from "../../hooks/usePageMeta";
import "./AdminOrders.css";

const STATUSES = [
  { value: "", label: "All statuses" },
  { value: "processing", label: "Processing" },
  { value: "transit", label: "In transit" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

const STATUS_META = {
  processing: { label: "Processing", icon: CircleDashed, tone: "info" },
  transit: { label: "In transit", icon: Truck, tone: "warn" },
  delivered: { label: "Delivered", icon: PackageCheck, tone: "ok" },
  cancelled: { label: "Cancelled", icon: XCircle, tone: "danger" },
};

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || { label: status, icon: CircleDashed, tone: "muted" };
  const Icon = meta.icon;
  return (
    <span className={`ao-badge ao-badge--${meta.tone}`}>
      <Icon size={12} aria-hidden="true" />
      {meta.label}
    </span>
  );
}

function formatDate(iso) {
  const ts = Date.parse(iso);
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function summariseItems(items) {
  if (!Array.isArray(items) || items.length === 0) return "—";
  const first = items[0]?.title || "Item";
  const more = items.length - 1;
  return more > 0 ? `${first} +${more} more` : first;
}

export default function AdminOrders() {
  usePageMeta({
    title: "Admin Orders",
    description: "Review and update SmartCart orders.",
  });

  const toast = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [updating, setUpdating] = useState(null);
  const filterRef = useRef(null);

  useEffect(() => {
    if (!filterOpen) return undefined;
    const onClick = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setFilterOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === "Escape") setFilterOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [filterOpen]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await adminListOrders();
        if (cancelled) return;
        setOrders(data.orders || []);
      } catch (err) {
        if (cancelled) return;
        setError(err.response?.data?.message || "Couldn't load orders.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (statusFilter && (o.status || "processing") !== statusFilter) return false;
      if (!q) return true;
      const hay = `${o.id} ${o.userEmail || ""} ${o.userId || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [orders, search, statusFilter]);

  async function changeStatus(order, status) {
    setUpdating(order.id);
    try {
      const data = await adminUpdateOrderStatus(order.id, status);
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? data.order : o))
      );
      toast.success(`Order ${order.id} marked ${STATUS_META[status]?.label.toLowerCase() || status}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't update status.");
    } finally {
      setUpdating(null);
    }
  }

  const activeFilterLabel =
    STATUSES.find((s) => s.value === statusFilter)?.label || "All statuses";

  return (
    <AdminLayout
      title="Orders"
      subtitle="Track every order placed in the storefront and move them through fulfilment."
    >
      {error ? <p className="ao-error" role="alert">{error}</p> : null}

      <section className="adm-card ao-toolbar">
        <label className="ao-search">
          <Search size={16} aria-hidden="true" />
          <input
            type="search"
            placeholder="Search by order id or customer email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search orders"
          />
        </label>
        <div className="ao-filter" ref={filterRef}>
          <button
            type="button"
            className={"adm-btn" + (statusFilter ? " adm-btn-primary" : "")}
            onClick={() => setFilterOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={filterOpen}
          >
            <Filter size={14} aria-hidden="true" />
            <span>{activeFilterLabel}</span>
          </button>
          {filterOpen ? (
            <ul className="ao-filter-menu" role="menu">
              {STATUSES.map((s) => (
                <li key={s.value || "all"}>
                  <button
                    type="button"
                    role="menuitemradio"
                    aria-checked={statusFilter === s.value}
                    className={
                      "ao-filter-option" +
                      (statusFilter === s.value ? " ao-filter-option--active" : "")
                    }
                    onClick={() => {
                      setStatusFilter(s.value);
                      setFilterOpen(false);
                    }}
                  >
                    <CheckCircle2
                      size={14}
                      aria-hidden="true"
                      style={{
                        opacity: statusFilter === s.value ? 1 : 0,
                      }}
                    />
                    {s.label}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </section>

      <section className="adm-card ao-table-card">
        <div className="ao-table-scroll">
          <table className="ao-table" aria-label="Orders">
            <thead>
              <tr>
                <th scope="col">Order</th>
                <th scope="col">Customer</th>
                <th scope="col">Items</th>
                <th scope="col">Total</th>
                <th scope="col">Placed</th>
                <th scope="col">Status</th>
                <th scope="col" className="ao-th-actions">Update</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="ao-loading">Loading orders…</td>
                </tr>
              ) : visible.length === 0 ? (
                <tr>
                  <td colSpan={7} className="ao-empty">
                    No orders match your filters.
                  </td>
                </tr>
              ) : (
                visible.map((o) => {
                  const status = o.status || "processing";
                  const isUpdating = updating === o.id;
                  return (
                    <tr key={o.id}>
                      <td>
                        <strong>#{o.id}</strong>
                      </td>
                      <td>
                        <span className="ao-customer">
                          {o.userEmail || o.userId || "—"}
                        </span>
                      </td>
                      <td className="ao-items">{summariseItems(o.items)}</td>
                      <td>${Number(o.totals?.total || 0).toFixed(2)}</td>
                      <td>{formatDate(o.createdAt)}</td>
                      <td>
                        <StatusBadge status={status} />
                      </td>
                      <td>
                        <select
                          className="ao-select"
                          value={status}
                          onChange={(e) => changeStatus(o, e.target.value)}
                          disabled={isUpdating}
                          aria-label={`Update status for order ${o.id}`}
                        >
                          <option value="processing">Processing</option>
                          <option value="transit">In transit</option>
                          <option value="delivered">Delivered</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </AdminLayout>
  );
}
