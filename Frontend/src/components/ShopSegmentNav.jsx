import { useCallback, useEffect, useRef, useState } from "react";
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
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const scrollRef = useRef(null);
  const controlled = activeControlled !== undefined && typeof onSegmentChange === "function";
  /** Home uses chips only to open the catalog — no segment matches the current page, so never highlight. */
  const browseOnly = typeof onSegmentNavigate === "function" && !controlled;
  const active = browseOnly ? null : controlled ? activeControlled : internalActive;

  const refreshScrollButtons = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    const hasOverflow = maxScroll > 1;
    setCanScrollLeft(hasOverflow && el.scrollLeft > 2);
    setCanScrollRight(hasOverflow && el.scrollLeft < maxScroll - 2);
  }, []);

  const select = (segment) => {
    if (typeof onSegmentNavigate === "function") {
      onSegmentNavigate(segment);
      return;
    }
    if (controlled) onSegmentChange(segment);
    else setInternalActive(segment);
  };

  useEffect(() => {
    refreshScrollButtons();
    const el = scrollRef.current;
    if (!el) return;

    const onResize = () => refreshScrollButtons();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, [segments, resultSummary, refreshScrollButtons]);

  const scrollByDir = (direction) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * 180, behavior: "smooth" });
    window.setTimeout(refreshScrollButtons, 180);
  };

  return (
    <div className="shop-segment-nav">
      <button
        type="button"
        className={`shop-segment-arrow shop-segment-arrow--left${canScrollLeft ? "" : " is-hidden"}`}
        aria-label="Scroll categories left"
        disabled={!canScrollLeft}
        onClick={() => scrollByDir(-1)}
      >
        ‹
      </button>
      <div className="shop-segment-inner" ref={scrollRef} onScroll={refreshScrollButtons}>
        {segments.map((segment) => {
          const prefix =
            segment === "AI Picks" ? "✦ " : segment === "Trending" ? "↗ " : "";
          return (
            <button
              key={segment}
              type="button"
              className={segment === active ? "segment-chip active" : "segment-chip"}
              onClick={() => select(segment)}
            >
              {prefix}
              {segment}
            </button>
          );
        })}
        {resultSummary ? <span className="catalog-result-count">{resultSummary}</span> : null}
      </div>
      <button
        type="button"
        className={`shop-segment-arrow shop-segment-arrow--right${canScrollRight ? "" : " is-hidden"}`}
        aria-label="Scroll categories right"
        disabled={!canScrollRight}
        onClick={() => scrollByDir(1)}
      >
        ›
      </button>
    </div>
  );
}
