/**
 * Shared loading placeholders for the admin console.
 * Uses `.adm-skel` shimmer styles from AdminLayout.css.
 */

import CenteredLoader from "../../components/CenteredLoader";
export function StatCardSkeleton() {
  return (
    <article className="ad-stat ad-stat--skel" aria-hidden="true">
      <header className="ad-stat-head">
        <span
          className="adm-skel adm-skel-line adm-skel-line--title"
          style={{ width: "42%" }}
        />
        <span
          className="adm-skel adm-skel-thumb ad-stat-skel-icon"
          aria-hidden="true"
        />
      </header>
      <span className="adm-skel adm-skel-line adm-skel-line--num" />
      <span
        className="adm-skel adm-skel-line adm-skel-line--sm"
        style={{ width: "58%" }}
      />
    </article>
  );
}

export function StatCardsSkeleton({ count = 4 }) {
  return Array.from({ length: count }, (_, i) => (
    <StatCardSkeleton key={`stat-skel-${i}`} />
  ));
}

export function AdminBarChartSkeleton({ rows = 5 }) {
  return (
    <div className="adm-skel-bars" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div key={`bar-skel-${i}`} className="adm-skel-bar-row">
          <span
            className="adm-skel adm-skel-line"
            style={{ width: `${52 + (i * 11) % 38}%` }}
          />
          <span className="adm-skel adm-skel-bar-track" />
          <span className="adm-skel adm-skel-line" style={{ width: 44 }} />
        </div>
      ))}
    </div>
  );
}

export function AdminHealthSkeleton() {
  return (
    <ul className="aa-health aa-health--skel" aria-hidden="true">
      {Array.from({ length: 3 }, (_, i) => (
        <li key={`health-skel-${i}`}>
          <span className="adm-skel aa-health-skel-dot" />
          <span className="adm-skel adm-skel-line adm-skel-line--num" />
          <span
            className="adm-skel adm-skel-line adm-skel-line--sm"
            style={{ width: 56 }}
          />
        </li>
      ))}
    </ul>
  );
}

export function AdminAlertsListSkeleton({ rows = 4 }) {
  return (
    <ul className="adm-alerts-skel-list" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <li key={`alert-skel-${i}`} className="adm-alerts-skel-item">
          <span className="adm-skel adm-skel-thumb" />
          <div className="adm-skel-stack" style={{ flex: 1 }}>
            <span
              className="adm-skel adm-skel-line adm-skel-line--lg"
              style={{ width: "72%" }}
            />
            <span
              className="adm-skel adm-skel-line adm-skel-line--sm"
              style={{ width: "45%" }}
            />
          </div>
          <span className="adm-skel adm-skel-line" style={{ width: 52 }} />
        </li>
      ))}
    </ul>
  );
}

export function AdminTableSkeleton({ rows = 6, cols = 6 }) {
  return Array.from({ length: rows }, (_, row) => (
    <tr key={`tbl-skel-${row}`} className="adm-table-skel-row">
      {Array.from({ length: cols }, (_, col) => (
        <td key={`tbl-skel-${row}-${col}`}>
          <span
            className="adm-skel adm-skel-line adm-skel-line--table"
            style={{ width: `${38 + ((row + col) * 11) % 48}%` }}
          />
        </td>
      ))}
    </tr>
  ));
}

/** Centered spinner + label inside a table (Customer alerts, etc.) */
export function AdminTableLoading({ colSpan, label = "Loading…" }) {
  return (
    <tr className="adm-table-loading-row">
      <td colSpan={colSpan}>
        <CenteredLoader label={label} compact className="adm-table-loader" />
      </td>
    </tr>
  );
}

export function AdminSearchResultsSkeleton({ rows = 4 }) {
  return (
    <ul className="adm-search-skel-list" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <li key={`search-skel-${i}`} className="adm-search-skel-item">
          <span className="adm-skel adm-skel-thumb" style={{ width: 28, height: 28 }} />
          <div className="adm-skel-stack" style={{ flex: 1 }}>
            <span
              className="adm-skel adm-skel-line"
              style={{ width: `${55 + (i * 9) % 30}%` }}
            />
            <span
              className="adm-skel adm-skel-line adm-skel-line--sm"
              style={{ width: "40%" }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function AdminInlineSkeleton({ width = "100%", height = 14 }) {
  return (
    <span
      className="adm-skel adm-skel-line"
      style={{ width, height, display: "inline-block" }}
      aria-hidden="true"
    />
  );
}
