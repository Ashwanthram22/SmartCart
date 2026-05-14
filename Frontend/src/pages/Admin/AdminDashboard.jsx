import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Boxes,
  ClipboardList,
  CreditCard,
  PackagePlus,
  Plus,
  Receipt,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  UserPlus,
} from "lucide-react";
import AdminLayout from "./AdminLayout";
import AdmDropdown from "../../components/AdmDropdown";
import {
  adminGetRecentActivity,
  adminGetSalesChart,
  adminGetStats,
  adminListOrders,
} from "../../api/client";
import usePageMeta from "../../hooks/usePageMeta";
import { formatMoney } from "../../utils/money";
import "./AdminDashboard.css";

const RANGE_OPTIONS = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "365", label: "Last 12 months" },
];

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

/* Tiny inline SVG sparkline used inside StatCards. Keeps the chart logic
 * dependency-free — same idea as the larger SalesChart but rendered
 * non-interactively at small scale. */
function Sparkline({ values, tone = "up" }) {
  const w = 120;
  const h = 36;
  const pad = 2;
  if (!values || values.length < 2) {
    return <div className="adm-spark adm-spark--empty" aria-hidden="true" />;
  }
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const stepX = (w - pad * 2) / (values.length - 1);
  const points = values.map((v, i) => ({
    x: pad + stepX * i,
    y: h - pad - ((v - min) / Math.max(1, max - min)) * (h - pad * 2),
  }));
  const path = points
    .map((p, i, arr) => {
      if (i === 0) return `M ${p.x} ${p.y}`;
      const prev = arr[i - 1];
      const cx = (prev.x + p.x) / 2;
      return `Q ${cx} ${prev.y} ${p.x} ${p.y}`;
    })
    .join(" ");
  const area = `${path} L ${pad + stepX * (values.length - 1)} ${h - pad} L ${pad} ${h - pad} Z`;
  const color = tone === "warn" ? "#dc2626" : tone === "muted" ? "#94a3b8" : "#6b38d4";
  const fill = tone === "warn" ? "rgba(220,38,38,0.18)" : tone === "muted" ? "rgba(148,163,184,0.18)" : "rgba(167,139,250,0.32)";
  return (
    <svg className="adm-spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      <path d={area} fill={fill} />
      <path d={path} fill="none" stroke={color} strokeWidth="1.6" />
    </svg>
  );
}

function DeltaPill({ value, suffix = "" }) {
  if (value == null || !Number.isFinite(value)) return null;
  const positive = value >= 0;
  return (
    <span
      className={"ad-delta " + (positive ? "ad-delta--up" : "ad-delta--down")}
      title={positive ? "Up vs previous period" : "Down vs previous period"}
    >
      {positive ? (
        <ArrowUpRight size={12} aria-hidden="true" />
      ) : (
        <ArrowDownRight size={12} aria-hidden="true" />
      )}
      {positive ? "+" : ""}
      {value}%{suffix}
    </span>
  );
}

function StatCard({ icon: Icon, title, value, helper, helperTone = "muted", spark, sparkTone, delta }) {
  return (
    <article className="ad-stat">
      <header className="ad-stat-head">
        <span className="ad-stat-title">{title}</span>
        <span className="ad-stat-icon" aria-hidden="true">
          <Icon size={18} />
        </span>
      </header>
      <strong className="ad-stat-value">{value}</strong>
      <div className="ad-stat-row">
        {delta != null ? <DeltaPill value={delta} /> : null}
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
      </div>
      {spark ? <Sparkline values={spark} tone={sparkTone} /> : null}
    </article>
  );
}

function SalesChart({ data }) {
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

  // Show 5 evenly spaced ticks on the x-axis.
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

/* Compact 16-bucket sparkline series derived from a daily revenue array. */
function bucketSeries(arr, buckets = 16) {
  if (!arr || arr.length === 0) return [];
  if (arr.length <= buckets) return arr;
  const out = [];
  const size = arr.length / buckets;
  for (let i = 0; i < buckets; i += 1) {
    const slice = arr.slice(Math.floor(i * size), Math.floor((i + 1) * size));
    if (slice.length === 0) continue;
    out.push(slice.reduce((a, b) => a + b, 0) / slice.length);
  }
  return out;
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
  const [orders, setOrders] = useState([]);
  const [range, setRange] = useState("30");
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);
  const [error, setError] = useState("");

  // Initial load (stats + activity + a long-tail of orders for AOV).
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [s, a, o] = await Promise.all([
          adminGetStats(),
          adminGetRecentActivity(),
          adminListOrders(),
        ]);
        if (cancelled) return;
        setStats(s.totals);
        setActivity(a.items || []);
        setOrders(o.orders || []);
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

  // Re-fetch sales chart whenever the time range changes.
  useEffect(() => {
    let cancelled = false;
    async function loadChart() {
      setChartLoading(true);
      try {
        const c = await adminGetSalesChart(Number(range));
        if (cancelled) return;
        setChart(c);
      } catch (err) {
        if (cancelled) return;
        setError(err.response?.data?.message || "Couldn't load sales chart.");
      } finally {
        if (!cancelled) setChartLoading(false);
      }
    }
    loadChart();
    return () => {
      cancelled = true;
    };
  }, [range]);

  const totals = stats || {};

  /* Period-aware metrics derived from the full orders list + the sales chart
   * for the current range. We compute a "previous period" of the same length
   * just before the current range so the delta pills can show change. */
  const periodMetrics = useMemo(() => {
    if (!orders.length || !chart?.revenue?.length) {
      return {
        revenue: 0,
        revenueDelta: null,
        ordersCount: 0,
        ordersDelta: null,
        aov: 0,
        aovDelta: null,
      };
    }
    const days = Number(range);
    const now = Date.now();
    const cutoff = now - days * 86400000;
    const prevCutoff = now - days * 2 * 86400000;
    const inRange = orders.filter((o) => {
      const ts = Date.parse(o.createdAt);
      return ts && ts >= cutoff;
    });
    const inPrev = orders.filter((o) => {
      const ts = Date.parse(o.createdAt);
      return ts && ts >= prevCutoff && ts < cutoff;
    });
    const sum = (arr) => arr.reduce((s, o) => s + Number(o.totals?.total || 0), 0);
    const revenue = sum(inRange);
    const prevRevenue = sum(inPrev);
    const aov = inRange.length === 0 ? 0 : revenue / inRange.length;
    const prevAov = inPrev.length === 0 ? 0 : prevRevenue / inPrev.length;
    const pct = (curr, prev) => {
      if (!prev) return curr > 0 ? 100 : 0;
      return Math.round(((curr - prev) / prev) * 1000) / 10;
    };
    return {
      revenue,
      revenueDelta: pct(revenue, prevRevenue),
      ordersCount: inRange.length,
      ordersDelta: pct(inRange.length, inPrev.length),
      aov,
      aovDelta: pct(aov, prevAov),
    };
  }, [orders, chart, range]);

  const sparkSeries = useMemo(
    () => bucketSeries(chart?.revenue || [], 16),
    [chart]
  );

  return (
    <AdminLayout
      title="Dashboard Overview"
      subtitle="Real-time performance metrics and AI insights."
      actions={
        <>
          <AdmDropdown
            value={range}
            options={RANGE_OPTIONS}
            onChange={setRange}
            ariaLabel="Time range"
          />
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
    >
      {error ? <p className="ad-error" role="alert">{error}</p> : null}

      <section className="ad-stats-grid" aria-label="Key metrics">
        <StatCard
          icon={CreditCard}
          title="Revenue"
          value={loading ? "—" : formatMoney(periodMetrics.revenue)}
          helper={loading ? "Loading…" : `vs previous ${range} days`}
          helperTone="muted"
          delta={loading ? null : periodMetrics.revenueDelta}
          // spark={sparkSeries}
        />
        <StatCard
          icon={ShoppingBag}
          title="Orders"
          value={loading ? "—" : (periodMetrics.ordersCount || 0).toLocaleString()}
          helper={loading ? "Loading…" : `vs previous ${range} days`}
          helperTone="muted"
          delta={loading ? null : periodMetrics.ordersDelta}
          // spark={sparkSeries}
        />
        {/* <StatCard
          icon={Receipt}
          title="Avg Order Value"
          value={loading ? "—" : formatMoney(periodMetrics.aov)}
          helper={loading ? "Loading…" : `vs previous ${range} days`}
          helperTone="muted"
          delta={loading ? null : periodMetrics.aovDelta}
          spark={sparkSeries}
        /> */}
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
          sparkTone="warn"
        />
      </section>

      <section className="ad-grid">
        <article className="adm-card ad-chart-card">
          <header className="adm-card-head">
            <div>
              <h3 className="adm-card-title">Sales Performance</h3>
              <p className="adm-card-sub">
                Revenue analytics over the {range === "365" ? "last 12 months" : `last ${range} days`}
              </p>
            </div>
          </header>
          <div className="ad-chart-wrap">
            {loading || chartLoading ? (
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
            <ul className="ad-activity-list" aria-hidden="true">
              {Array.from({ length: 4 }).map((_, i) => (
                <li key={`sk-${i}`} className="ad-activity-row">
                  <span className="adm-skel adm-skel-thumb" style={{ width: 32, height: 32 }} />
                  <div className="adm-skel-stack" style={{ flex: 1 }}>
                    <span className="adm-skel adm-skel-line" style={{ width: "70%" }} />
                    <span className="adm-skel adm-skel-line adm-skel-line--sm" style={{ width: "40%" }} />
                  </div>
                </li>
              ))}
            </ul>
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
