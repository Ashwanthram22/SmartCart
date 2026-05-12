import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowUpRight,
  Boxes,
  ClipboardList,
  CreditCard,
  PackagePlus,
  Plus,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  UserPlus,
} from "lucide-react";
import AdminLayout from "./AdminLayout";
import {
  adminGetRecentActivity,
  adminGetSalesChart,
  adminGetStats,
} from "../../api/client";
import usePageMeta from "../../hooks/usePageMeta";
import "./AdminDashboard.css";

function formatMoney(value) {
  if (!Number.isFinite(value)) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatRelative(iso) {
  const ts = Date.parse(iso);
  if (!ts) return "";
  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function StatCard({ icon: Icon, title, value, helper, helperTone = "muted" }) {
  return (
    <article className="ad-stat">
      <header className="ad-stat-head">
        <span className="ad-stat-title">{title}</span>
        <span className="ad-stat-icon" aria-hidden="true">
          <Icon size={18} />
        </span>
      </header>
      <strong className="ad-stat-value">{value}</strong>
      {helper ? (
        <p className={`ad-stat-helper ad-stat-helper--${helperTone}`}>
          {helperTone === "up" ? (
            <TrendingUp size={12} aria-hidden="true" />
          ) : helperTone === "warn" ? (
            <AlertTriangle size={12} aria-hidden="true" />
          ) : null}
          <span>{helper}</span>
        </p>
      ) : null}
    </article>
  );
}

function SalesChart({ data }) {
  /** Render a smooth SVG line + filled area chart from a numeric array. */
  const labels = useMemo(() => data?.labels || [], [data]);
  const series = useMemo(() => data?.revenue || [], [data]);
  const w = 720;
  const h = 220;
  const padX = 24;
  const padY = 24;

  const chart = useMemo(() => {
    if (!series.length) return null;
    const max = Math.max(...series, 1);
    const stepX = (w - padX * 2) / Math.max(1, series.length - 1);
    const points = series.map((value, i) => {
      const x = padX + stepX * i;
      const y = h - padY - (value / max) * (h - padY * 2);
      return { x, y };
    });
    const path = points
      .map((p, i, arr) => {
        if (i === 0) return `M ${p.x} ${p.y}`;
        const prev = arr[i - 1];
        const cx = (prev.x + p.x) / 2;
        return `Q ${cx} ${prev.y} ${p.x} ${p.y}`;
      })
      .join(" ");
    const area = `${path} L ${padX + stepX * (series.length - 1)} ${h - padY} L ${padX} ${h - padY} Z`;
    return { points, path, area, max };
  }, [series]);

  if (!chart) {
    return <p className="ad-chart-empty">No sales recorded yet.</p>;
  }

  // Show 5 evenly spaced ticks on the x-axis
  const tickIdx = [0, Math.floor(labels.length * 0.25), Math.floor(labels.length * 0.5), Math.floor(labels.length * 0.75), labels.length - 1];

  return (
    <svg
      role="img"
      aria-label="Daily revenue trend"
      viewBox={`0 0 ${w} ${h + 24}`}
      className="ad-chart-svg"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="adChartFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#a78bfa" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={chart.area} fill="url(#adChartFill)" />
      <path d={chart.path} fill="none" stroke="#6b38d4" strokeWidth="2.4" />
      {tickIdx.map((i) => (
        <g key={`tick-${i}`}>
          <text
            x={padX + ((w - padX * 2) / Math.max(1, series.length - 1)) * i}
            y={h + 14}
            textAnchor="middle"
            fontSize="11"
            fill="#94a3b8"
            fontFamily="Inter, system-ui, sans-serif"
          >
            {labels[i] ? labels[i].slice(5) : ""}
          </text>
        </g>
      ))}
    </svg>
  );
}

function ActivityIcon({ type }) {
  if (type === "stock") return <Boxes size={16} aria-hidden="true" />;
  if (type === "user") return <UserPlus size={16} aria-hidden="true" />;
  return <ShoppingBag size={16} aria-hidden="true" />;
}

export default function AdminDashboard() {
  usePageMeta({
    title: "Admin Dashboard",
    description: "Real-time performance metrics and SmartCart AI insights.",
  });

  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [chart, setChart] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [s, c, a] = await Promise.all([
          adminGetStats(),
          adminGetSalesChart(30),
          adminGetRecentActivity(),
        ]);
        if (cancelled) return;
        setStats(s.totals);
        setChart(c);
        setActivity(a.items || []);
      } catch (err) {
        if (cancelled) return;
        setError(err.response?.data?.message || "Couldn't load dashboard data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const totals = stats || {};
  const revenueDelta = totals.revenueDeltaPct;
  const revenueDeltaText =
    revenueDelta == null
      ? "—"
      : `${revenueDelta >= 0 ? "+" : ""}${revenueDelta}% from previous 30 days`;

  return (
    <AdminLayout
      title="Dashboard Overview"
      subtitle="Real-time performance metrics and AI insights."
      actions={
        <>
          <button
            type="button"
            className="adm-btn"
            onClick={() => navigate("/admin/orders")}
          >
            <ClipboardList size={16} aria-hidden="true" />
            <span>View orders</span>
          </button>
          <button
            type="button"
            className="adm-btn adm-btn-primary"
            onClick={() => navigate("/admin/inventory?new=1")}
          >
            <Plus size={16} aria-hidden="true" />
            <span>Add product</span>
          </button>
        </>
      }
      onAddProduct={() => navigate("/admin/inventory?new=1")}
    >
      {error ? <p className="ad-error" role="alert">{error}</p> : null}

      <section className="ad-stats-grid" aria-label="Key metrics">
        <StatCard
          icon={CreditCard}
          title="Total Revenue"
          value={loading ? "—" : formatMoney(totals.revenue || 0)}
          helper={loading ? "Loading…" : revenueDeltaText}
          helperTone={revenueDelta >= 0 ? "up" : "warn"}
        />
        <StatCard
          icon={ShoppingBag}
          title="Total Orders"
          value={loading ? "—" : (totals.orders || 0).toLocaleString()}
          helper={
            loading
              ? "Loading…"
              : `${(totals.ordersLast30 || 0).toLocaleString()} in last 30 days`
          }
          helperTone="up"
        />
        <StatCard
          icon={PackagePlus}
          title="Active Products"
          value={loading ? "—" : (totals.activeProducts || 0).toLocaleString()}
          helper={loading ? "Loading…" : "Live in catalog"}
        />
        <StatCard
          icon={AlertTriangle}
          title="Inventory Alerts"
          value={loading ? "—" : (totals.lowStock || 0).toLocaleString()}
          helper={
            loading
              ? "Loading…"
              : totals.outOfStock > 0
              ? `${totals.outOfStock} out of stock`
              : "Require attention"
          }
          helperTone="warn"
        />
      </section>

      <section className="ad-grid">
        <article className="adm-card ad-chart-card">
          <header className="adm-card-head">
            <div>
              <h3 className="adm-card-title">Sales Performance</h3>
              <p className="adm-card-sub">Revenue analytics over the past 30 days</p>
            </div>
          </header>
          <div className="ad-chart-wrap">
            {loading ? (
              <div className="ad-chart-skeleton" aria-hidden="true" />
            ) : (
              <SalesChart data={chart} />
            )}
          </div>
        </article>

        <article className="adm-card ad-activity-card">
          <header className="adm-card-head">
            <div>
              <h3 className="adm-card-title">Recent Activity</h3>
              <p className="adm-card-sub">Latest updates from the store</p>
            </div>
          </header>
          {loading ? (
            <p className="ad-empty">Loading activity…</p>
          ) : activity.length === 0 ? (
            <p className="ad-empty">No activity yet.</p>
          ) : (
            <ul className="ad-activity-list">
              {activity.slice(0, 8).map((item) => (
                <li key={`${item.type}-${item.id}`} className="ad-activity-row">
                  <span className={`ad-activity-icon ad-activity-icon--${item.type}`}>
                    <ActivityIcon type={item.type} />
                  </span>
                  <div className="ad-activity-text">
                    <p className="ad-activity-title">{item.title}</p>
                    <p className="ad-activity-detail">{item.detail}</p>
                    <p className="ad-activity-time">{formatRelative(item.timestamp)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            className="adm-btn ad-activity-cta"
            onClick={() => navigate("/admin/orders")}
          >
            View all activity
            <ArrowUpRight size={14} aria-hidden="true" />
          </button>
        </article>
      </section>

      <section className="adm-card ad-tips">
        <div className="ad-tips-icon" aria-hidden="true">
          <Sparkles size={22} />
        </div>
        <div>
          <h3 className="ad-tips-title">SmartCart AI insight</h3>
          <p className="ad-tips-text">
            {totals.lowStock > 0
              ? `${totals.lowStock} product${totals.lowStock === 1 ? "" : "s"} are running low. Restocking now reduces back-in-stock churn.`
              : "Inventory looks healthy. Add a featured product to keep the catalog fresh."}
          </p>
        </div>
        <button
          type="button"
          className="adm-btn adm-btn-primary ad-tips-cta"
          onClick={() => navigate("/admin/inventory")}
        >
          Open inventory
        </button>
      </section>
    </AdminLayout>
  );
}
