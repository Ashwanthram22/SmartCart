import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useCart } from "../../hooks/useCart";
import { useSaved } from "../../hooks/useSaved";
import { HeartIcon } from "../../components/HeartIcon";
import { ShopTopNav } from "../../components/ShopTopNav";
import { CartIcon } from "../../components/CartIcon";
import { ShopSegmentNav } from "../../components/ShopSegmentNav";
import HomeFooter from "../Home/HomeFooter";
import { getProducts } from "../../api/client";
import "./ProductsCatalog.css";
import { isValidSegment, productMatchesSegment } from "../../constants/shopSegments";
import { pickTrendingProducts } from "../../utils/productSelection";

const TRENDING_TAB_LIMIT = 12;

function segmentFromSearchParams(searchParams) {
  const raw = searchParams.get("segment");
  return isValidSegment(raw) ? raw : "AI Picks";
}

/**
 * Client-side catalog search by title/category/catalogSegments.
 * Swap `getProducts()` for `getProducts({ q })` when the list outgrows JSON.
 */
function matchesSearchQuery(item, qNorm) {
  if (!qNorm) return true;
  const hay = `${item.title || ""} ${item.category || ""} ${(item.catalogSegments || []).join(" ")}`.toLowerCase();
  return hay.includes(qNorm);
}

function stockCap(product) {
  const n = Number(product?.stock);
  return Number.isFinite(n) ? n : Infinity;
}

const BRAND_OPTIONS = ["Apple", "Dell", "HP", "Lenovo", "Asus"];
const PROCESSORS = ["M3 Chip", "Core i9", "Ryzen 9"];
const PRODUCT_INSIGHTS = [
  "Top-tier performance for creative workloads. Price matches historical lows.",
  "Best battery-to-weight ratio in its class. Perfect for executive travel.",
  "Unmatched thermal efficiency. Ideal for high-refresh-rate gaming.",
  "Highest-rated model for students. Great for notes and media.",
];

function getBrand(product) {
  const source = (product.title || "").toLowerCase();
  if (source.includes("macbook")) return "Apple";
  if (source.includes("dell")) return "Dell";
  if (source.includes("hp")) return "HP";
  if (source.includes("lenovo")) return "Lenovo";
  if (source.includes("asus")) return "Asus";
  return "Dell";
}

function ProductsCatalog() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeSegment = segmentFromSearchParams(searchParams);
  const searchQ = (searchParams.get("q") || "").trim().toLowerCase();
  const { addItem } = useCart();
  const { isSaved, toggleSaved } = useSaved();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [priceRange, setPriceRange] = useState(5000);
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [minRating, setMinRating] = useState(4);
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await getProducts();
        if (!cancelled) setProducts(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setError("Unable to load products right now.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setPage(1);
  }, [activeSegment, searchQ]);

  /**
   * For the "Trending" tab we pre-compute the top N products by popularity
   * (same logic the home page Trending row uses) and only allow those IDs
   * through the rest of the filters. Memoized so brand/price/rating tweaks
   * don't recompute the trending set unnecessarily.
   */
  const trendingIdSet = useMemo(() => {
    if (activeSegment !== "Trending") return null;
    const top = pickTrendingProducts(products, TRENDING_TAB_LIMIT);
    return new Set(top.map((item) => item.id));
  }, [activeSegment, products]);

  const filtered = useMemo(() => {
    return products.filter((item) => {
      if (activeSegment === "Trending") {
        if (!trendingIdSet || !trendingIdSet.has(item.id)) return false;
      } else if (!productMatchesSegment(item, activeSegment)) {
        return false;
      }
      if (!matchesSearchQuery(item, searchQ)) return false;
      const brand = getBrand(item);
      const brandMatch = selectedBrands.length === 0 || selectedBrands.includes(brand);
      const priceMatch = Number(item.price || 0) <= priceRange * 100;
      const ratingMatch = Number(item.rating || 4) >= minRating;
      return brandMatch && priceMatch && ratingMatch;
    });
  }, [products, selectedBrands, priceRange, minRating, activeSegment, searchQ, trendingIdSet]);

  const perPage = 6;
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const clampedPage = Math.min(page, totalPages);
  const pageStart = (clampedPage - 1) * perPage;
  const pageItems = filtered.slice(pageStart, pageStart + perPage);

  const toggleBrand = (brand) => {
    setPage(1);
    setSelectedBrands((prev) =>
      prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]
    );
  };

  const openProduct = (productId) => {
    const params = new URLSearchParams();
    if (activeSegment !== "AI Picks") params.set("segment", activeSegment);
    const qRaw = searchParams.get("q");
    if (qRaw && qRaw.trim()) params.set("q", qRaw.trim());
    const qs = params.toString();
    navigate(qs ? `/catalog/products/${productId}?${qs}` : `/catalog/products/${productId}`);
  };

  const handleSegmentChange = (segment) => {
    setPage(1);
    const next = new URLSearchParams(searchParams);
    if (segment === "AI Picks") {
      next.delete("segment");
    } else {
      next.set("segment", segment);
    }
    setSearchParams(next);
  };

  const applySearch = (qRaw) => {
    setPage(1);
    const next = new URLSearchParams(searchParams);
    const trimmed = qRaw.trim();
    if (trimmed) next.set("q", trimmed);
    else next.delete("q");
    setSearchParams(next);
  };

  const resultsSummary =
    filtered.length === 0
      ? `Showing 0-0 of 0 results`
      : `Showing ${pageStart + 1}-${Math.min(pageStart + perPage, filtered.length)} of ${filtered.length} results`;

  const showEmptyState = !loading && !error && filtered.length === 0;

  return (
    <div className="catalog-page">
      <header className="shop-topnav-shell">
        <ShopTopNav
          searchPlaceholder="Search products..."
          searchQuery={searchParams.get("q") || ""}
          onSearchSubmit={applySearch}
        />
      </header>

      <div className="catalog-secondary-nav">
        <ShopSegmentNav activeSegment={activeSegment} onSegmentChange={handleSegmentChange} />
      </div>

      <main className="catalog-main">
        <aside className="catalog-sidebar">
          <section>
            <h3>Price</h3>
            <input
              type="range"
              min="500"
              max="5000"
              step="100"
              value={priceRange}
              onChange={(e) => {
                setPriceRange(Number(e.target.value));
                setPage(1);
              }}
            />
            <div className="range-labels">
              <span>$500</span>
              <span>${priceRange}+</span>
            </div>
          </section>

          <section>
            <h3>Brands</h3>
            {BRAND_OPTIONS.map((brand) => (
              <label key={brand} className="filter-check">
                <input
                  type="checkbox"
                  checked={selectedBrands.includes(brand)}
                  onChange={() => toggleBrand(brand)}
                />
                <span>{brand}</span>
              </label>
            ))}
          </section>

          <section>
            <h3>Customer Rating</h3>
            <button type="button" className="rating-filter-btn" onClick={() => setMinRating(4)}>
              ★★★★☆ &amp; Up
            </button>
          </section>

          <section>
            <h3>Specifications</h3>
            <p className="sub-label">Processor</p>
            <div className="spec-chips">
              {PROCESSORS.map((processor) => (
                <span key={processor}>{processor}</span>
              ))}
            </div>
          </section>
        </aside>

        <section className="catalog-content">
          <div className="catalog-content-head">
            <p className="catalog-results-summary">{resultsSummary}</p>
            <label>
              Sort by:
              <select defaultValue="Most Intelligent">
                <option>Most Intelligent</option>
                <option>Price: Low to High</option>
                <option>Price: High to Low</option>
                <option>Newest Arrivals</option>
              </select>
            </label>
          </div>

          {error ? <p className="catalog-error">{error}</p> : null}

          <div className="catalog-grid">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => <div key={i} className="catalog-card skeleton" />)
              : pageItems.map((product, index) => {
                  const cap = stockCap(product);
                  const out = cap < 1;
                  const saved = product.id != null && isSaved(product.id);
                  return (
                    <article
                      key={product.id ?? index}
                      className="catalog-card"
                      role="button"
                      tabIndex={0}
                      onClick={() => openProduct(product.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") openProduct(product.id);
                      }}
                    >
                      <div className="catalog-card-media">
                        <img src={product.image} alt={product.title} />
                        <button
                          type="button"
                          className={`wishlist-btn${saved ? " wishlist-btn--saved" : ""}`}
                          aria-label={saved ? "Remove from saved items" : "Save to profile"}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSaved(product);
                          }}
                        >
                          <HeartIcon filled={saved} size={16} />
                        </button>
                      </div>
                      <div className="catalog-card-body">
                        <h2>{product.title}</h2>
                        <p className="product-rating">
                          <span className="star">★</span> {product.rating ?? 4.7} (
                          {product.reviewCount ?? 128} reviews)
                        </p>
                        <div className="insight-box">
                          <p className="insight-head">✦ AI Insight</p>
                          <p className="insight-text">{PRODUCT_INSIGHTS[index % PRODUCT_INSIGHTS.length]}</p>
                        </div>
                      </div>
                      <div className="catalog-card-foot">
                        <strong>${((product.price || 0) / 2.8).toFixed(2)}</strong>
                        <button
                          type="button"
                          className="add-cart-btn"
                          aria-label={out ? "Out of stock" : "Add to cart"}
                          disabled={out}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (out) return;
                            addItem({
                              productId: product.id,
                              title: product.title,
                              image: product.image,
                              subtitle: `${product.category || "Product"} • ${product.rating ?? 4.7}★ rated`,
                              unitPrice: (product.price || 0) / 2.8,
                              stockAvailable: Number.isFinite(cap) ? cap : undefined,
                            });
                          }}
                        >
                          <CartIcon size={26} className="catalog-add-cart-icon" />
                        </button>
                      </div>
                    </article>
                  );
                })}
            {showEmptyState ? (
              <div className="catalog-empty-state">
                <h2 className="catalog-empty-title">No products match</h2>
                <p className="catalog-empty-text">
                  Try another tab or clear your search. AI Picks surfaces curated recommendations from across the store.
                </p>
                <Link className="catalog-empty-link" to="/catalog/products">
                  Go to AI Picks
                </Link>
              </div>
            ) : null}
          </div>

          {!showEmptyState ? (
            <div className="pagination">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={clampedPage === 1}
              >
                ‹
              </button>
              {Array.from({ length: Math.min(totalPages, 3) }).map((_, i) => {
                const pageNum = i + 1;
                return (
                  <button
                    key={pageNum}
                    type="button"
                    className={pageNum === clampedPage ? "active" : ""}
                    onClick={() => setPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                );
              })}
              {totalPages > 3 ? <span>...</span> : null}
              {totalPages > 3 ? (
                <button
                  type="button"
                  className={clampedPage === totalPages ? "active" : ""}
                  onClick={() => setPage(totalPages)}
                >
                  {totalPages}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={clampedPage === totalPages}
              >
                ›
              </button>
            </div>
          ) : null}
        </section>
      </main>

      <HomeFooter />

      <button type="button" className="catalog-floating-ai" aria-label="AI Assistant">
        ✦
      </button>
    </div>
  );
}

export default ProductsCatalog;
