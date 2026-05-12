import { useEffect, useMemo, useState } from "react";
import AdminLayout from "./AdminLayout";
import {
  adminGetSalesChart,
  adminGetStats,
  adminListOrders,
  adminListProducts,
} from "../../api/client";
import usePageMeta from "../../hooks/usePageMeta";
import "./AdminAnalytics.css";

function formatMoney(value) {
  if (!Number.isFinite(value)) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function BarChart({ data, valueFormat = (v) => v }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <ul className="aa-bars">
      {data.map((d) => {
        const pct = Math.round((d.value / max) * 100);
        return (
          <li key={d.label} className="aa-bar-row">
            <span className="aa-bar-label" title={d.label}>{d.label}</span>
            <span className="aa-bar-track" aria-hidden="true">
              <span className="aa-bar-fill" style={{ width: `${pct}%` }} />
            </span>
            <span className="aa-bar-value">{valueFormat(d.value)}</span>
          </li>
        );
      })}
      {data.length === 0 ? <li className="aa-empty">No data yet.</li> : null}
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

  const [stats, setStats] = useState(null);
  const [chart, setChart] = useState(null);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [s, c, o, p] = await Promise.all([
          adminGetStats(),
          adminGetSalesChart(60),
          adminListOrders(),
          adminListProducts(),
        ]);
        if (cancelled) return;
        setStats(s.totals);
        setChart(c);
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
    for (const order of orders) {
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
  }, [orders]);

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

  return (
    <AdminLayout
      title="Analytics"
      subtitle="Sales, inventory and customer insights at a glance."
    >
      {error ? <p className="aa-error" role="alert">{error}</p> : null}

      <section className="aa-grid-top">
        <article className="adm-card aa-summary">
          <header className="adm-card-head">
            <div>
              <h3 className="adm-card-title">Revenue · last 60 days</h3>
              <p className="adm-card-sub">
                {loading ? "Loading…" : formatMoney(stats?.revenue || 0)} all-time
              </p>
            </div>
          </header>
          <SparkArea values={chart?.revenue || []} />
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
              <p className="adm-card-sub">By number of products in catalog</p>
            </div>
          </header>
          <BarChart data={topCategories} valueFormat={(v) => `${v}`} />
        </article>

        <article className="adm-card">
          <header className="adm-card-head">
            <div>
              <h3 className="adm-card-title">Top products by revenue</h3>
              <p className="adm-card-sub">Across all paid orders</p>
            </div>
          </header>
          <BarChart data={revenueByProduct} valueFormat={(v) => formatMoney(v)} />
        </article>
      </section>
    </AdminLayout>
  );
}
