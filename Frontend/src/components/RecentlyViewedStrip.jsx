import { useEffect, useMemo, useReducer } from "react";
import { Link } from "react-router-dom";
import { Clock } from "lucide-react";
import { productDetailUrl } from "../constants/shopRoutes";
import { getRecentlyViewed } from "../utils/recentlyViewed";
import { onAuthChange } from "../utils/authToken";
import { formatMoney } from "../utils/money";
import "./RecentlyViewedStrip.css";

const MAX_DISPLAY = 8;

/**
 * Horizontal strip of recently-viewed products, used on the home page and
 * on every product detail page (where it skips the current product). Reads
 * straight from localStorage; the auth-change subscriber bumps a counter
 * so a fresh sign-in re-derives an empty strip without us calling setState
 * inside an effect body.
 */
export default function RecentlyViewedStrip({ excludeId, title = "Recently viewed" }) {
  const [authVersion, bumpAuthVersion] = useReducer((n) => n + 1, 0);

  useEffect(() => onAuthChange(bumpAuthVersion), []);

  const visible = useMemo(
    () => getRecentlyViewed({ excludeId }).slice(0, MAX_DISPLAY),
    // authVersion is intentionally part of the dep set so we re-read on logout/login.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [excludeId, authVersion]
  );

  if (visible.length === 0) return null;

  return (
    <section className="rv-strip" aria-labelledby="rv-strip-heading">
      <div className="rv-strip-head">
        <div className="rv-strip-title">
          <Clock size={18} aria-hidden="true" />
          <h2 id="rv-strip-heading">{title}</h2>
        </div>
        <span className="rv-strip-count">
          {visible.length} item{visible.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="rv-strip-rail" role="list">
        {visible.map((product) => (
          <Link
            key={product.id}
            to={productDetailUrl("AI Picks", product.id, "")}
            className="rv-strip-card"
            role="listitem"
          >
            <div className="rv-strip-thumb">
              {product.image ? (
                <img src={product.image} alt="" loading="lazy" />
              ) : null}
            </div>
            <div className="rv-strip-body">
              <p className="rv-strip-product-title">{product.title}</p>
              <p className="rv-strip-product-meta">
                <strong>{formatMoney(product.price)}</strong>
                {product.rating ? (
                  <span className="rv-strip-rating">★ {product.rating}</span>
                ) : null}
              </p>
              {product.category ? (
                <p className="rv-strip-product-cat">{product.category}</p>
              ) : null}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
