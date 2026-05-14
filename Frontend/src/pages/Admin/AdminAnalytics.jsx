import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "./AdminLayout";
import AdmDropdown from "../../components/AdmDropdown";
import {
  adminGetSalesChart,
  adminGetStats,
  adminListOrders,
  adminListProducts,
} from "../../api/client";
import usePageMeta from "../../hooks/usePageMeta";
import { formatMoney } from "../../utils/money";
import "./AdminAnalytics.css";

const RANGE_OPTIONS = [
  { value: "30", label: "Last 30 days" },
  { value: "60", label: "Last 60 days" },
  { value: "90", label: "Last 90 days" },
  { value: "365", label: "Last 12 months" },
];

/* Bars are now buttons (when an `onClick(label)` handler is supplied) so
 * users can drill from analytics into the inventory page filtered by the
 * matching category. Falls back to a non-interactive list otherwise. */
function BarChart({ data, valueFormat = (v) => v, onBarClick }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  if (data.length === 0) {
    return <p className="aa-empty">No data yet.</p>;
  }
  return (
    <ul className="aa-bars">
      {data.map((d) => {
        const pct = Math.round((d.value / max) * 100);
        const Row = (
          <span className="aa-bar-track" aria-hidden="true">
            <span className="aa-bar-fill" style={{ width: `${pct}%` }} />
          </span>
        );
        return (
          <li key={d.label} className="aa-bar-row">
            {onBarClick ? (
              <button
                type="button"
                className="aa-bar-label aa-bar-label--btn"
                title={`Drill into ${d.label}`}
                onClick={() => onBarClick(d.label)}
              >
                {d.label}
              </button>
            ) : (
              <span className="aa-bar-label" title={d.label}>{d.label}</span>
            )}
            {Row}
            <span className="aa-bar-value">{valueFormat(d.value)}</span>
          </li>
        );
      })}
    </ul>
  );
}

function SparkArea({ values, height = 140 }) {
  const w = 600;
  const h = height;
  const pad = 8;

  if (!values || values.length === 0) return <p className="aa-empty">No data yet.</p>;

  const max = Math.max(...values, 1);
  const stepX = (w - pad * 2) / Math.max(1, values.length - 1);
  const points = values.map((v, i) => ({
    x: pad + stepX * i,
    y: h - pad - (v / max) * (h - pad * 2),
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

  return (
    <svg
      role="img"
      aria-label="Trend"
      viewBox={`0 0 ${w} ${h}`}
      className="aa-spark"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="aaSparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6b38d4" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#6b38d4" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#aaSparkFill)" />
      <path d={path} fill="none" stroke="#6b38d4" strokeWidth="2.4" />
    </svg>
  );
}

export default function AdminAnalytics() {
  usePageMeta({
    title: "Admin Analytics",
    description: "Sales, inventory and customer insights for SmartCart.",
  });

  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [chart, setChart] = useState(null);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);
  const [error, setError] = useState("");
  const [range, setRange] = useState("60");

  // Initial heavy load (stats + orders + products) — independent of range.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [s, o, p] = await Promise.all([
          adminGetStats(),
          adminListOrders(),
          adminListProducts(),
        ]);
        if (cancelled) return;
        setStats(s.totals);
        setOrders(o.orders || []);
        setProducts(p.products || []);
      } catch (err) {
        if (cancelled) return;
        setError(err.response?.data?.message || "Couldn't load analytics.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Re-fetch sales chart whenever the range dropdown changes.
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
        setError(err.response?.data?.message || "Couldn't load chart.");
      } finally {
        if (!cancelled) setChartLoading(false);
      }
    }
    loadChart();
    return () => {
      cancelled = true;
    };
  }, [range]);

  // Filter orders to the active range so dependent metrics stay aligned.
  const ordersInRange = useMemo(() => {
    const cutoff = Date.now() - Number(range) * 86400000;
    return orders.filter((o) => {
      const ts = Date.parse(o.createdAt);
      return ts && ts >= cutoff;
    });
  }, [orders, range]);

  const topCategories = useMemo(() => {
    if (!products.length) return [];
    const counts = new Map();
    for (const p of products) {
      const key = p.category || "Uncategorised";
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return [...counts.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [products]);

  const revenueByProduct = useMemo(() => {
    const totals = new Map();
    for (const order of ordersInRange) {
      const items = Array.isArray(order.items) ? order.items : [];
      for (const item of items) {
        const key = item.title || item.id || "Item";
        const qty = Number(item.quantity || 1);
        const price = Number(item.priceAtPurchase ?? item.price ?? 0);
        totals.set(key, (totals.get(key) || 0) + qty * price);
      }
    }
    return [...totals.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [ordersInRange]);

  const stockHealth = useMemo(() => {
    let healthy = 0;
    let low = 0;
    let out = 0;
    for (const p of products) {
      const stock = Number(p.stock || 0);
      if (stock === 0) out += 1;
      else if (stock <= 10) low += 1;
      else healthy += 1;
    }
    return { healthy, low, out };
  }, [products]);

  const rangeRevenue = useMemo(
    () => ordersInRange.reduce((s, o) => s + Number(o.totals?.total || 0), 0),
    [ordersInRange]
  );

  const drillIntoCategory = (label) => {
    // Inventory page already has a search input that scans title/brand/
    // category/id, so we just push the category as the search query.
    const params = new URLSearchParams({ q: label });
    navigate(`/admin/inventory?${params.toString()}`);
  };

  const rangeLabel = RANGE_OPTIONS.find((r) => r.value === range)?.label || "";

  return (
    <AdminLayout
      title="Analytics"
      subtitle="Sales, inventory and customer insights at a glance."
      actions={
        <AdmDropdown
          value={range}
          options={RANGE_OPTIONS}
          onChange={setRange}
          ariaLabel="Time range"
        />
      }
    >
      {error ? <p className="aa-error" role="alert">{error}</p> : null}

      <section className="aa-grid-top">
        <article className="adm-card aa-summary">
          <header className="adm-card-head">
            <div>
              <h3 className="adm-card-title">Revenue · {rangeLabel.toLowerCase()}</h3>
              <p className="adm-card-sub">
                {loading ? "Loading…" : `${formatMoney(rangeRevenue)} this period · ${formatMoney(stats?.revenue || 0)} all-time`}
              </p>
            </div>
          </header>
          {chartLoading ? (
            <div className="adm-skel" style={{ width: "100%", height: 160 }} />
          ) : (
            <SparkArea values={chart?.revenue || []} />
          )}
        </article>

        <article className="adm-card aa-stock-card">
          <header className="adm-card-head">
            <div>
              <h3 className="adm-card-title">Inventory health</h3>
              <p className="adm-card-sub">Stock status across the catalog</p>
            </div>
          </header>
          <ul className="aa-health">
            <li>
              <span className="aa-dot aa-dot--ok" aria-hidden="true" />
              <strong>{stockHealth.healthy}</strong>
              <span>Healthy</span>
            </li>
            <li>
              <span className="aa-dot aa-dot--warn" aria-hidden="true" />
              <strong>{stockHealth.low}</strong>
              <span>Low</span>
            </li>
            <li>
              <span className="aa-dot aa-dot--danger" aria-hidden="true" />
              <strong>{stockHealth.out}</strong>
              <span>Out of stock</span>
            </li>
          </ul>
        </article>
      </section>

      <section className="aa-grid">
        <article className="adm-card">
          <header className="adm-card-head">
            <div>
              <h3 className="adm-card-title">Top categories</h3>
              <p className="adm-card-sub">Click a category to view its products</p>
            </div>
          </header>
          {loading ? (
            <div className="adm-skel-stack" style={{ gap: 10 }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} className="adm-skel adm-skel-line" style={{ width: `${60 + (i * 7) % 35}%` }} />
              ))}
            </div>
          ) : (
            <BarChart
              data={topCategories}
              valueFormat={(v) => `${v}`}
              onBarClick={drillIntoCategory}
            />
          )}
        </article>

        <article className="adm-card">
          <header className="adm-card-head">
            <div>
              <h3 className="adm-card-title">Top products by revenue</h3>
              <p className="adm-card-sub">Across orders in this period</p>
            </div>
          </header>
          {loading ? (
            <div className="adm-skel-stack" style={{ gap: 10 }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} className="adm-skel adm-skel-line" style={{ width: `${50 + (i * 11) % 45}%` }} />
              ))}
            </div>
          ) : (
            <BarChart data={revenueByProduct} valueFormat={(v) => formatMoney(v)} />
          )}
        </article>
      </section>
    </AdminLayout>
  );
}
