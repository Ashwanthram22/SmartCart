import { Fragment } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import "./Breadcrumbs.css";

/**
 * Reusable breadcrumb trail.
 *   <Breadcrumbs items={[
 *     { label: "Home", to: "/home" },
 *     { label: "Products", to: "/products" },
 *     { label: "Electronics", to: "/products/electronics" },
 *     { label: "Aurapods Max" },     // current page — no `to`
 *   ]} />
 *
 * The last item is always rendered as plain text (the "current" crumb)
 * regardless of whether it has a `to`. We wrap in a <nav aria-label>
 * with the right schema-org JSON-LD-friendly markup so screen readers
 * announce it correctly.
 */
export default function Breadcrumbs({ items, className = "" }) {
  if (!Array.isArray(items) || items.length === 0) return null;

  return (
    <nav className={`breadcrumbs ${className}`.trim()} aria-label="Breadcrumb">
      <ol className="breadcrumbs-list">
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          return (
            <Fragment key={`${item.label}-${idx}`}>
              <li className="breadcrumbs-item">
                {!isLast && item.to ? (
                  <Link to={item.to} className="breadcrumbs-link">
                    {item.label}
                  </Link>
                ) : (
                  <span
                    className="breadcrumbs-current"
                    aria-current={isLast ? "page" : undefined}
                  >
                    {item.label}
                  </span>
                )}
              </li>
              {!isLast ? (
                <li className="breadcrumbs-sep" aria-hidden="true">
                  <ChevronRight size={14} strokeWidth={2.25} className="breadcrumbs-sep-icon" />
                </li>
              ) : null}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
