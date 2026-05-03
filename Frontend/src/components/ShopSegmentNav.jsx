import { useState } from "react";
import { SHOP_SEGMENTS } from "../constants/shopSegments";
import "./ShopSegmentNav.css";

export { SHOP_SEGMENTS };

/**
 * Category segment chips + optional results line (catalog uses controlled active).
 * Pass `onSegmentNavigate` on Home to jump to `/catalog/products?segment=…`.
 */
export function ShopSegmentNav({
  segments = SHOP_SEGMENTS,
  activeSegment: activeControlled,
  onSegmentChange,
  onSegmentNavigate,
  resultSummary,
}) {
  const [internalActive, setInternalActive] = useState(segments[0]);
  const controlled = activeControlled !== undefined && typeof onSegmentChange === "function";
  /** Home uses chips only to open the catalog — no segment matches the current page, so never highlight. */
  const browseOnly = typeof onSegmentNavigate === "function" && !controlled;
  const active = browseOnly ? null : controlled ? activeControlled : internalActive;

  const select = (segment) => {
    if (typeof onSegmentNavigate === "function") {
      onSegmentNavigate(segment);
      return;
    }
    if (controlled) onSegmentChange(segment);
    else setInternalActive(segment);
  };

  return (
    <div className="shop-segment-inner">
      {segments.map((segment) => (
        <button
          key={segment}
          type="button"
          className={segment === active ? "segment-chip active" : "segment-chip"}
          onClick={() => select(segment)}
        >
          {segment === "AI Picks" ? "✦ " : ""}
          {segment}
        </button>
      ))}
      {resultSummary ? <span className="catalog-result-count">{resultSummary}</span> : null}
    </div>
  );
}
