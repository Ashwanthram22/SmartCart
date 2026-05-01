import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useCart } from "../../hooks/useCart";
import { ShopTopNav } from "../../components/ShopTopNav";
import { CartIcon } from "../../components/CartIcon";
import { ShopSegmentNav } from "../../components/ShopSegmentNav";
import HomeFooter from "../Home/HomeFooter";
import { getProducts } from "../../api/client";
import "./LaptopsCatalog.css";
import { useEffect } from "react";
import { isValidSegment, productMatchesSegment } from "../../constants/shopSegments";

function segmentFromSearchParams(searchParams) {
  const raw = searchParams.get("segment");
  return isValidSegment(raw) ? raw : "AI Picks";
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

function LaptopsCatalog() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeSegment = segmentFromSearchParams(searchParams);
  const { addItem } = useCart();
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
  }, [activeSegment]);

  const filtered = useMemo(() => {
    return products.filter((item) => {
      if (!productMatchesSegment(item, activeSegment)) return false;
      const brand = getBrand(item);
      const brandMatch = selectedBrands.length === 0 || selectedBrands.includes(brand);
      const priceMatch = Number(item.price || 0) <= priceRange * 100;
      const ratingMatch = Number(item.rating || 4) >= minRating;
      return brandMatch && priceMatch && ratingMatch;
    });
  }, [products, selectedBrands, priceRange, minRating, activeSegment]);

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
    navigate(`/catalog/laptops/${productId}`);
  };

  const handleSegmentChange = (segment) => {
    setPage(1);
    if (segment === "AI Picks") {
      setSearchParams({}, { replace: true });
    } else {
      setSearchParams({ segment }, { replace: false });
    }
  };

  return (
    <div className="catalog-page">
      <header className="shop-topnav-shell">
        <ShopTopNav searchPlaceholder="Search laptops..." />
      </header>

      <div className="catalog-secondary-nav">
        <ShopSegmentNav
          activeSegment={activeSegment}
          onSegmentChange={handleSegmentChange}
          resultSummary={`Showing ${filtered.length === 0 ? 0 : pageStart + 1}-${Math.min(pageStart + perPage, filtered.length)} of ${filtered.length} results`}
        />
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
            <h1>
              Premium Laptops
              {activeSegment !== "AI Picks" ? (
                <span className="catalog-segment-title"> · {activeSegment}</span>
              ) : null}
            </h1>
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
              : pageItems.map((product, index) => (
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
                      <span className="card-badge">{product.badge || "AI CHOICE"}</span>
                      <button
                        type="button"
                        className="wishlist-btn"
                        aria-label="Wishlist"
                        onClick={(e) => e.stopPropagation()}
                      >
                        ♡
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
                        aria-label="Add to cart"
                        onClick={(e) => {
                          e.stopPropagation();
                          addItem({
                            productId: product.id,
                            title: product.title,
                            image: product.image,
                            subtitle: `${product.category || "Laptop"} • ${product.rating ?? 4.7}★ rated`,
                            unitPrice: (product.price || 0) / 2.8,
                          });
                        }}
                      >
                        <CartIcon size={26} className="catalog-add-cart-icon" />
                      </button>
                    </div>
                  </article>
                ))}
          </div>

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
        </section>
      </main>

      <HomeFooter />

      <button type="button" className="catalog-floating-ai" aria-label="AI Assistant">
        ✦
      </button>
    </div>
  );
}

export default LaptopsCatalog;
