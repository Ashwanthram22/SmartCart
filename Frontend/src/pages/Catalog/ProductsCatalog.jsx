import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useCart } from "../../hooks/useCart";
import { useSaved } from "../../hooks/useSaved";
import { HeartIcon } from "../../components/HeartIcon";
import { ShopTopNav } from "../../components/ShopTopNav";
import { CartIcon } from "../../components/CartIcon";
import { ShopSegmentNav } from "../../components/ShopSegmentNav";
import usePageMeta from "../../hooks/usePageMeta";
import StockBadge from "../../components/StockBadge";
import StockAlertButton from "../../components/StockAlertButton";
import Breadcrumbs from "../../components/Breadcrumbs";
import HomeFooter from "../Home/HomeFooter";
import { getProductFilters, getProducts } from "../../api/client";
import { formatMoney, formatMoneyShort } from "../../utils/money";
import { getCatalogGridImageProps } from "../../utils/catalogImage";
import "./ProductsCatalog.css";
import AdmDropdown from "../../components/AdmDropdown";
import {
  CATALOG_LIST_BASE,
  catalogListUrl,
  productDetailUrl,
  segmentForProductsListRoute,
} from "../../constants/shopRoutes";

/** Debounce window for refetching products as the user drags the price slider. */
const PRODUCT_REFETCH_DEBOUNCE_MS = 200;

/** Number of products fetched per page from the server. */
const PAGE_SIZE = 12;

const SORT_OPTIONS = [
  { value: "recommended", label: "Recommended" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "rating", label: "Highest Rated" },
  { value: "newest", label: "Newest Arrivals" },
];

/**
 * Filter facets are loaded from `GET /api/products/filters?segment=...&q=...`.
 * This is the empty shape we render before the first response lands so the
 * sidebar can keep its layout instead of jumping when data arrives.
 */
const EMPTY_FILTER_OPTIONS = {
  price: { min: 0, max: 0 },
  brands: [],
  ratings: [],
  specifications: {},
};

function stockCap(product) {
  const n = Number(product?.stock);
  return Number.isFinite(n) ? n : Infinity;
}

const PRODUCT_INSIGHTS = [
  "Top-tier performance for creative workloads. Price matches historical lows.",
  "Best battery-to-weight ratio in its class. Perfect for executive travel.",
  "Unmatched thermal efficiency. Ideal for high-refresh-rate gaming.",
  "Highest-rated model for students. Great for notes and media.",
];

function ratingTierLabel(tier) {
  const filled = Math.floor(tier);
  const half = tier - filled >= 0.5;
  const empty = 5 - filled - (half ? 1 : 0);
  return "★".repeat(filled) + (half ? "½" : "") + "☆".repeat(Math.max(0, empty));
}

function ProductsCatalog() {
  const navigate = useNavigate();
  const { segmentSlug } = useParams();
  const [searchParams] = useSearchParams();
  const listSegment = segmentForProductsListRoute(segmentSlug);
  const invalidListSlug = Boolean(segmentSlug && listSegment == null);
  const activeSegment = listSegment ?? "AI Picks";
  const rawQuery = (searchParams.get("q") || "").trim();
  const searchQ = rawQuery.toLowerCase();
  const [badCatalogImages, setBadCatalogImages] = useState(() => new Set());
  const { addItem } = useCart();

  usePageMeta({
    title: rawQuery ? `Search: ${rawQuery}` : `${activeSegment} — products`,
    description: `Browse ${activeSegment.toLowerCase()} on SmartCart AI with smart filters, ratings and AI-curated insights.`,
  });
  const { isSaved, toggleSaved } = useSaved();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filterOptions, setFilterOptions] = useState(EMPTY_FILTER_OPTIONS);
  const [filtersLoading, setFiltersLoading] = useState(true);
  const [filtersError, setFiltersError] = useState("");
  const [filtersReady, setFiltersReady] = useState(false);

  const [priceRange, setPriceRange] = useState(0);
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [minRating, setMinRating] = useState(0);
  const [sort, setSort] = useState("recommended");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    setBadCatalogImages(new Set());
  }, [activeSegment, searchQ]);

  useEffect(() => {
    if (!invalidListSlug) return;
    navigate(catalogListUrl("AI Picks", rawQuery), { replace: true });
  }, [invalidListSlug, rawQuery, navigate]);

  /**
   * Step 1 of the per-tab flow: fetch the facet options for the current
   * segment + search context. While this is in flight we treat the page as
   * "not ready" so the products effect doesn't fire with stale state.
   *
   * When the response lands we reset all user filter selections to permissive
   * defaults derived from the API:
   *   - selectedBrands → []  (no brand restriction; "filters empty = all
   *     products in this category", per the product spec)
   *   - priceRange → API max (slider sits fully open)
   *   - minRating  → lowest tier the API offers, falling back to 0
   *
   * Resetting on every tab/search change is what guarantees that switching
   * from "Electronics" (with a brand checked) to "Groceries" doesn't lock
   * the new tab to zero results.
   */
  useEffect(() => {
    let cancelled = false;
    async function loadFilters() {
      setFiltersLoading(true);
      setFiltersError("");
      setFiltersReady(false);
      setProducts([]);
      try {
        const data = await getProductFilters({
          segment: activeSegment,
          q: searchQ || undefined,
        });
        if (cancelled) return;
        const options = {
          price: {
            min: Number(data?.price?.min) || 0,
            max: Number(data?.price?.max) || 0,
          },
          brands: Array.isArray(data?.brands) ? data.brands : [],
          ratings: Array.isArray(data?.ratings) ? data.ratings : [],
          specifications:
            data?.specifications && typeof data.specifications === "object"
              ? data.specifications
              : {},
        };
        setFilterOptions(options);
        setSelectedBrands([]);
        setPriceRange(options.price.max || 0);
        setMinRating(options.ratings.length ? options.ratings[0] : 0);
        setSort("recommended");
        setPage(1);
        setHasMore(false);
        setTotalCount(0);
        setFiltersReady(true);
      } catch {
        if (!cancelled) {
          setFilterOptions(EMPTY_FILTER_OPTIONS);
          setFiltersError("Unable to load filter options right now.");
          setFiltersReady(true);
        }
      } finally {
        if (!cancelled) setFiltersLoading(false);
      }
    }
    loadFilters();
    return () => {
      cancelled = true;
    };
  }, [activeSegment, searchQ]);

  /**
   * Step 2 of the per-tab flow: once filter options are ready (and any time
   * the user adjusts a filter or sort) we re-fetch the product list from
   * the filter-aware `/api/products` endpoint. Brand whitelist is sent
   * only when something is actually checked, and the price cap is omitted
   * when the slider is sitting at the catalog max — both keep the URL
   * clean and let the backend short-circuit to "every product in this
   * category".
   *
   * A short debounce smooths out price-slider drags so we don't fire one
   * request per pixel. The first page is always replaced; "Load more"
   * appends below via the separate handler.
   */
  useEffect(() => {
    if (!filtersReady) return undefined;
    let cancelled = false;
    setLoading(true);
    setError("");

    const handle = window.setTimeout(async () => {
      try {
        const data = await getProducts({
          segment: activeSegment,
          q: searchQ || undefined,
          brand: selectedBrands.length ? selectedBrands : undefined,
          priceMax:
            priceRange > 0 && priceRange < (filterOptions.price.max || Infinity)
              ? priceRange
              : undefined,
          minRating: minRating > 0 ? minRating : undefined,
          sort,
          page: 1,
          limit: PAGE_SIZE,
        });
        if (cancelled) return;
        const items = Array.isArray(data?.items) ? data.items : [];
        setProducts(items);
        setTotalCount(Number(data?.total) || items.length);
        setHasMore(Boolean(data?.hasMore));
        setPage(1);
      } catch {
        if (!cancelled) setError("Unable to load products right now.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, PRODUCT_REFETCH_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [
    filtersReady,
    activeSegment,
    searchQ,
    selectedBrands,
    priceRange,
    minRating,
    sort,
    filterOptions.price.max,
  ]);

  const loadMore = useCallback(async () => {
    if (loadingMore || loading || !hasMore) return;
    setLoadingMore(true);
    setError("");
    try {
      const next = page + 1;
      const data = await getProducts({
        segment: activeSegment,
        q: searchQ || undefined,
        brand: selectedBrands.length ? selectedBrands : undefined,
        priceMax:
          priceRange > 0 && priceRange < (filterOptions.price.max || Infinity)
            ? priceRange
            : undefined,
        minRating: minRating > 0 ? minRating : undefined,
        sort,
        page: next,
        limit: PAGE_SIZE,
      });
      const items = Array.isArray(data?.items) ? data.items : [];
      setProducts((prev) => {
        // De-dupe defensively in case the user pages quickly while a
        // filter change is also in flight.
        const seen = new Set(prev.map((p) => String(p.id)));
        const additions = items.filter((p) => !seen.has(String(p.id)));
        return [...prev, ...additions];
      });
      setTotalCount(Number(data?.total) || 0);
      setHasMore(Boolean(data?.hasMore));
      setPage(next);
    } catch {
      setError("Couldn't load more products.");
    } finally {
      setLoadingMore(false);
    }
  }, [
    activeSegment,
    filterOptions.price.max,
    hasMore,
    loading,
    loadingMore,
    minRating,
    page,
    priceRange,
    searchQ,
    selectedBrands,
    sort,
  ]);

  const priceMin = filterOptions.price.min || 0;
  const priceMax = filterOptions.price.max || 0;
  const priceStep = useMemo(() => {
    const span = Math.max(0, priceMax - priceMin);
    if (span === 0) return 1;
    return Math.max(1, Math.round(span / 100));
  }, [priceMin, priceMax]);

  /**
   * Show the full skeleton only while the very first list for this tab is
   * loading. Subsequent filter tweaks keep the previous results visible so
   * the grid doesn't flash on every checkbox click.
   */
  const showProductLoading =
    (loading && products.length === 0) || (filtersLoading && !filtersReady);

  const toggleBrand = (brand) => {
    setSelectedBrands((prev) =>
      prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]
    );
  };

  const openProduct = (productId) => {
    const q = (searchParams.get("q") || "").trim();
    navigate(productDetailUrl(activeSegment, productId, q));
  };

  const handleSegmentChange = (segment) => {
    const q = (searchParams.get("q") || "").trim();
    navigate(catalogListUrl(segment, q));
  };

  const applySearch = (qRaw) => {
    const trimmed = qRaw.trim();
    navigate(catalogListUrl(activeSegment, trimmed));
  };

  const resultsSummary =
    products.length === 0
      ? `Showing 0 of 0 results`
      : `Showing ${products.length} of ${totalCount} results`;

  const showEmptyState = !showProductLoading && !error && products.length === 0;
  const emptyFromSearch = showEmptyState && rawQuery.length > 0;

  const markCatalogImageBad = (productId) => {
    if (productId == null) return;
    setBadCatalogImages((prev) => {
      const next = new Set(prev);
      next.add(productId);
      return next;
    });
  };

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

      <div className="catalog-breadcrumbs-bar">
        <Breadcrumbs
          items={[
            { label: "Home", to: "/home" },
            { label: "Products", to: CATALOG_LIST_BASE },
            { label: activeSegment },
          ]}
        />
      </div>

      <main id="main-content" className="catalog-main">
        <aside className="catalog-sidebar" aria-busy={filtersLoading}>
          {filtersError ? (
            <p className="catalog-error">{filtersError}</p>
          ) : null}

          {priceMax > 0 ? (
            <section>
              <h3>Price</h3>
              <input
                type="range"
                min={priceMin}
                max={priceMax}
                step={priceStep}
                value={priceRange}
                disabled={filtersLoading}
                onChange={(e) => {
                  setPriceRange(Number(e.target.value));
                  setPage(1);
                }}
              />
              <div className="range-labels">
                <span>{formatMoneyShort(priceMin)}</span>
                <span>{formatMoneyShort(priceRange)}{priceRange < priceMax ? "" : "+"}</span>
              </div>
            </section>
          ) : null}

          {filterOptions.brands.length > 0 ? (
            <section>
              <h3>Brands</h3>
              {filterOptions.brands.map((brand) => (
                <label key={brand} className="filter-check">
                  <input
                    type="checkbox"
                    checked={selectedBrands.includes(brand)}
                    onChange={() => toggleBrand(brand)}
                    disabled={filtersLoading}
                  />
                  <span>{brand}</span>
                </label>
              ))}
            </section>
          ) : null}

          {filterOptions.ratings.length > 0 ? (
            <section>
              <h3>Customer Rating</h3>
              <div className="rating-filter-list">
                {filterOptions.ratings.map((tier) => (
                  <button
                    key={tier}
                    type="button"
                    className={`rating-filter-btn${minRating === tier ? " is-active" : ""}`}
                    onClick={() => {
                      setMinRating(tier);
                      setPage(1);
                    }}
                    disabled={filtersLoading}
                  >
                    {ratingTierLabel(tier)} &amp; Up
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          {Object.keys(filterOptions.specifications).length > 0 ? (
            <section>
              <h3>Specifications</h3>
              {Object.entries(filterOptions.specifications).map(([group, values]) => (
                <div key={group} className="spec-group">
                  <p className="sub-label">{group}</p>
                  <div className="spec-chips">
                    {values.map((value) => (
                      <span key={value}>{value}</span>
                    ))}
                  </div>
                </div>
              ))}
            </section>
          ) : null}

          {!filtersLoading &&
          priceMax === 0 &&
          filterOptions.brands.length === 0 &&
          filterOptions.ratings.length === 0 &&
          Object.keys(filterOptions.specifications).length === 0 ? (
            <p className="catalog-empty-text">No filters available for this tab.</p>
          ) : null}
        </aside>

        <section className="catalog-content">
          <div className="catalog-content-head">
            <p className="catalog-results-summary">{resultsSummary}</p>
            <div className="catalog-sort-row">
              <span className="catalog-sort-label-text">Sort by:</span>
              <AdmDropdown
                value={sort}
                options={SORT_OPTIONS}
                onChange={setSort}
                disabled={showProductLoading}
                ariaLabel="Sort products"
                menuAlign="right"
                className="catalog-sort-dd"
              />
            </div>
          </div>

          {error ? <p className="catalog-error">{error}</p> : null}

          <div className="catalog-grid">
            {showProductLoading
              ? Array.from({ length: PAGE_SIZE }).map((_, i) => <div key={i} className="catalog-card skeleton" />)
              : products.map((product, index) => {
                  const cap = stockCap(product);
                  const out = cap < 1;
                  const saved = product.id != null && isSaved(product.id);
                  const gridImg = getCatalogGridImageProps(product.image, { index });
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
                        {!product.image || badCatalogImages.has(product.id) ? (
                          <div
                            className="catalog-card-media-placeholder"
                            role="img"
                            aria-label={`${product.title} — no image`}
                          >
                            <span aria-hidden="true">No image</span>
                          </div>
                        ) : (
                          <img
                            alt={product.title}
                            onError={() => markCatalogImageBad(product.id)}
                            {...gridImg}
                          />
                        )}
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
                        <StockBadge stock={product.stock} compact />
                        <div className="insight-box">
                          <p className="insight-head">✦ AI Insight</p>
                          <p className="insight-text">{PRODUCT_INSIGHTS[index % PRODUCT_INSIGHTS.length]}</p>
                        </div>
                      </div>
                      <div className="catalog-card-foot">
                        <strong>{formatMoney(product.price || 0)}</strong>
                        {out ? (
                          <span onClick={(e) => e.stopPropagation()}>
                            <StockAlertButton productId={product.id} />
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="add-cart-btn"
                            aria-label="Add to cart"
                            onClick={(e) => {
                              e.stopPropagation();
                              addItem({
                                productId: product.id,
                                title: product.title,
                                image: product.image,
                                subtitle: `${product.category || "Product"} • ${product.rating ?? 4.7}★ rated`,
                                unitPrice: Number(product.price) || 0,
                                stockAvailable: Number.isFinite(cap) ? cap : undefined,
                              });
                            }}
                          >
                            <CartIcon size={26} className="catalog-add-cart-icon" />
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
            {showEmptyState ? (
              <div className="catalog-empty-state">
                {emptyFromSearch ? (
                  <>
                    <h2 className="catalog-empty-title">
                      No results for &ldquo;{rawQuery}&rdquo;
                    </h2>
                    <p className="catalog-empty-text">
                      Try a shorter phrase, check spelling, or browse AI Picks for curated picks in this category.
                    </p>
                    <div className="catalog-empty-actions">
                      <button
                        type="button"
                        className="catalog-empty-btn"
                        onClick={() => applySearch("")}
                      >
                        Clear search
                      </button>
                      <Link className="catalog-empty-link" to={CATALOG_LIST_BASE}>
                        Go to AI Picks
                      </Link>
                    </div>
                  </>
                ) : (
                  <>
                    <h2 className="catalog-empty-title">No products match</h2>
                    <p className="catalog-empty-text">
                      Try another tab or widen your filters. AI Picks surfaces curated recommendations from across the store.
                    </p>
                    <div className="catalog-empty-actions">
                      <Link className="catalog-empty-link" to={CATALOG_LIST_BASE}>
                        Go to AI Picks
                      </Link>
                    </div>
                  </>
                )}
              </div>
            ) : null}
          </div>

          {!showEmptyState && hasMore ? (
            <div className="catalog-loadmore">
              <button
                type="button"
                className="catalog-loadmore-btn"
                onClick={loadMore}
                disabled={loadingMore}
              >
                {loadingMore ? "Loading…" : `Load more (${totalCount - products.length} more)`}
              </button>
            </div>
          ) : !showEmptyState && products.length > 0 && totalCount > 0 ? (
            <p className="catalog-loadmore-end">You&apos;ve reached the end of the list.</p>
          ) : null}
        </section>
      </main>

      <HomeFooter />
    </div>
  );
}

export default ProductsCatalog;
