import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, Package, TrendingDown } from "lucide-react";
import AdminLayout from "./AdminLayout";
import { AdminTableLoading } from "./AdminSkeletons";
import {
  adminFulfillCustomerAlert,
  adminListCustomerAlerts,
} from "../../api/client";
import { useToast } from "../../hooks/useToast";
import usePageMeta from "../../hooks/usePageMeta";
import { formatMoney } from "../../utils/money";
import "./AdminCustomerAlerts.css";

function formatWhen(iso) {
  const ts = Date.parse(iso);
  if (!ts) return "—";
  return new Date(ts).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function kindLabel(kind) {
  return kind === "stock" ? "Back in stock" : "Price drop";
}

function KindIcon({ kind }) {
  return kind === "stock" ? (
    <Package size={16} aria-hidden="true" />
  ) : (
    <TrendingDown size={16} aria-hidden="true" />
  );
}

function FulfillDialog({ row, onClose, onDone }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const isStock = row.kind === "stock";
  const [newStock, setNewStock] = useState(
    String(Math.max(1, Number(row.currentStock) || 10))
  );
  const [newPrice, setNewPrice] = useState(
    String(row.targetPrice ?? row.currentPrice ?? "")
  );

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await adminFulfillCustomerAlert({
        kind: row.kind,
        userId: row.userId,
        alertId: row.alertId,
        ...(isStock
          ? { newStock: Number(newStock) }
          : { newPrice: Number(newPrice) }),
      });
      toast.success("Product updated and customer notified.");
      onDone();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not fulfill this request.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="aca-dialog-overlay" role="presentation" onClick={onClose}>
      <div
        className="aca-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="aca-dialog-title"
        onClick={(ev) => ev.stopPropagation()}
      >
        <h2 id="aca-dialog-title" className="aca-dialog-title">
          Fulfill {kindLabel(row.kind)} request
        </h2>
        <p className="aca-dialog-sub">
          <strong>{row.userName || row.userEmail}</strong> asked about{" "}
          <strong>{row.productTitle}</strong>
          {row.kind === "price" && row.targetPrice != null ? (
            <>
              {" "}
              (target {formatMoney(row.targetPrice)})
            </>
          ) : null}
        </p>
        <form className="aca-dialog-form" onSubmit={submit}>
          {isStock ? (
            <label className="aca-field">
              <span>New stock quantity</span>
              <input
                type="number"
                min="1"
                step="1"
                value={newStock}
                onChange={(e) => setNewStock(e.target.value)}
                required
              />
            </label>
          ) : (
            <label className="aca-field">
              <span>New price (INR)</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                required
              />
              <small>Must be at or below the customer&apos;s target price.</small>
            </label>
          )}
          <div className="aca-dialog-actions">
            <button type="button" className="adm-btn adm-btn-ghost" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="adm-btn adm-btn-primary" disabled={busy}>
              {busy ? "Sending…" : "Update & notify customer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminCustomerAlerts() {
  usePageMeta({
    title: "Customer alerts",
    description: "Stock and price-drop requests from shoppers.",
  });

  const toast = useToast();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fulfillRow, setFulfillRow] = useState(null);
  const [filter, setFilter] = useState("all");

  const load = useCallback(async () => {
    setError("");
    try {
      const data = await adminListCustomerAlerts();
      setAlerts(Array.isArray(data?.alerts) ? data.alerts : []);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't load customer alerts.");
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (filter === "all") return alerts;
    return alerts.filter((a) => a.kind === filter);
  }, [alerts, filter]);

  const counts = useMemo(
    () => ({
      all: alerts.length,
      stock: alerts.filter((a) => a.kind === "stock").length,
      price: alerts.filter((a) => a.kind === "price").length,
    }),
    [alerts]
  );

  return (
    <AdminLayout
      title="Customer alerts"
      subtitle="When shoppers tap Notify on a product, requests appear here. Update stock or price, then send them an in-app notification."
    >
      <section className="adm-card aca-toolbar">
        <ul className="adm-chips" role="tablist" aria-label="Filter alert type">
          {[
            { key: "all", label: "All" },
            { key: "stock", label: "Back in stock" },
            { key: "price", label: "Price drop" },
          ].map((c) => (
            <li key={c.key}>
              <button
                type="button"
                role="tab"
                aria-selected={filter === c.key}
                className={"adm-chip" + (filter === c.key ? " adm-chip--active" : "")}
                onClick={() => setFilter(c.key)}
              >
                {c.label}
                <span className="adm-chip-count">{counts[c.key]}</span>
              </button>
            </li>
          ))}
        </ul>
        <button type="button" className="adm-btn adm-btn-ghost" onClick={load} disabled={loading}>
          Refresh
        </button>
      </section>

      {error ? <p className="aca-error" role="alert">{error}</p> : null}

      <section className="adm-card aca-table-wrap">
        <table className="aca-table">
          <thead>
            <tr>
              <th scope="col">Type</th>
              <th scope="col">Customer</th>
              <th scope="col">Product</th>
              <th scope="col">Details</th>
              <th scope="col">Requested</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <AdminTableLoading
                colSpan={6}
                label="Loading customer alerts…"
              />
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="aca-empty">
                  <Bell size={20} aria-hidden="true" />
                  <p>No pending alert requests.</p>
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr key={`${row.kind}-${row.alertId}`}>
                  <td>
                    <span className={`aca-kind aca-kind--${row.kind}`}>
                      <KindIcon kind={row.kind} />
                      {kindLabel(row.kind)}
                    </span>
                  </td>
                  <td>
                    <span className="aca-customer">{row.userName || "—"}</span>
                    <small>{row.userEmail}</small>
                  </td>
                  <td>
                    <Link
                      to={`/admin/inventory?q=${encodeURIComponent(row.productId)}`}
                      className="aca-product-link"
                    >
                      {row.productTitle}
                    </Link>
                    <small>{row.productId}</small>
                  </td>
                  <td>
                    {row.kind === "price" ? (
                      <>
                        Target {formatMoney(row.targetPrice)}
                        <br />
                        <small>Now {formatMoney(row.currentPrice)}</small>
                      </>
                    ) : (
                      <>
                        Stock now: {row.currentStock ?? 0}
                      </>
                    )}
                  </td>
                  <td>{formatWhen(row.createdAt)}</td>
                  <td>
                    <button
                      type="button"
                      className="adm-btn adm-btn-primary aca-fulfill-btn"
                      onClick={() => setFulfillRow(row)}
                    >
                      Fulfill
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {fulfillRow ? (
        <FulfillDialog
          row={fulfillRow}
          onClose={() => setFulfillRow(null)}
          onDone={load}
        />
      ) : null}
    </AdminLayout>
  );
}
