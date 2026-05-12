import "./StockBadge.css";

/**
 * Single source of truth for how stock levels are surfaced in the UI.
 *
 * Tiers (matching `stock` from the backend):
 *   - 0           → "Out of stock"  (red)
 *   - 1..3        → "Only N left"   (amber)
 *   - 4..10       → "Low stock"     (amber)
 *   - 11+         → "In stock"      (green) - hidden when `compact`
 *   - undefined   → nothing rendered (treated as "stock unknown")
 *
 * Variants:
 *   - "inline" (default) - small chip suitable for cards / cart rows
 *   - "block"            - larger pill for hero / detail page
 *   - "compact"          - shorter labels, hides the "in stock" tier
 */
export default function StockBadge({ stock, variant = "inline", compact = false }) {
  if (stock == null || !Number.isFinite(Number(stock))) return null;
  const n = Number(stock);

  let tone;
  let label;
  if (n <= 0) {
    tone = "out";
    label = "Out of stock";
  } else if (n <= 3) {
    tone = "low";
    label = `Only ${n} left`;
  } else if (n <= 10) {
    tone = "low";
    label = compact ? "Low stock" : `Low stock — ${n} left`;
  } else {
    if (compact) return null;
    tone = "ok";
    label = "In stock";
  }

  return (
    <span
      className={`stock-badge stock-badge--${tone} stock-badge--${variant}`}
      role="status"
      aria-label={label}
    >
      <span className="stock-badge-dot" aria-hidden="true" />
      {label}
    </span>
  );
}
