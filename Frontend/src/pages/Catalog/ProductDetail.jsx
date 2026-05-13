import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useCart } from "../../hooks/useCart";
import { useSaved } from "../../hooks/useSaved";
import { useToast } from "../../hooks/useToast";
import { HeartIcon } from "../../components/HeartIcon";
import { isValidSegment } from "../../constants/shopSegments";
import { DEFAULT_PROFILE_AVATAR } from "../../data/profileDisplay";
import { productSpecsFor } from "../../data/productSpecs";
import { createProductReview, getProductById } from "../../api/client";
import { trackViewedProduct } from "../../utils/recentlyViewed";
import HomeFooter from "../Home/HomeFooter";
import { CartIcon } from "../../components/CartIcon";
import RecentlyViewedStrip from "../../components/RecentlyViewedStrip";
import Breadcrumbs from "../../components/Breadcrumbs";
import StockBadge from "../../components/StockBadge";
import StockAlertButton from "../../components/StockAlertButton";
import PriceDropAlertButton from "../../components/PriceDropAlertButton";
import usePageMeta from "../../hooks/usePageMeta";
import useStructuredData from "../../hooks/useStructuredData";
import ReviewModal from "./ReviewModal";
import ProductDetailSkeleton from "./ProductDetailSkeleton";
import { estimateDelivery, formatDeliveryWindow } from "../../utils/delivery";
import { formatMoney } from "../../utils/money";
import "./ProductDetail.css";

const GALLERY_FALLBACKS = [
  "https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=800&q=80",
];

/**
 * Static "seed" reviews shown on products that don't yet have any user-submitted
 * reviews so the panel never looks empty. As soon as a real review lands, the
 * API list takes over.
 */
const FALLBACK_REVIEWS = [
  {
    id: "seed-ms",
    userName: "Marcus Sterling",
    rating: 5,
    text:
      "Thermal management is incredible. I rendered 4K footage for hours and fan noise stayed very low.",
  },
  {
    id: "seed-al",
    userName: "Anna Liang",
    rating: 4,
    text:
      "Excellent keyboard and screen quality. Great for development and long productivity sessions.",
  },
];

function getInitials(name) {
  if (!name) return "?";
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatRelativeDate(iso) {
  if (!iso) return "";
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return "";
  const diffSec = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hr ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay} day${diffDay > 1 ? "s" : ""} ago`;
  return new Date(ts).toLocaleDateString();
}

function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const segmentRaw = searchParams.get("segment");
  const qRaw = searchParams.get("q");

  const catalogListHref = useMemo(() => {
    const p = new URLSearchParams();
    if (segmentRaw && isValidSegment(segmentRaw) && segmentRaw !== "AI Picks") {
      p.set("segment", segmentRaw);
    }
    if (qRaw && qRaw.trim()) p.set("q", qRaw.trim());
    const s = p.toString();
    return s ? `/catalog/products?${s}` : "/catalog/products";
  }, [segmentRaw, qRaw]);

  const detailQuerySuffix = useMemo(() => {
    const p = new URLSearchParams();
    if (segmentRaw && isValidSegment(segmentRaw) && segmentRaw !== "AI Picks") {
      p.set("segment", segmentRaw);
    }
    if (qRaw && qRaw.trim()) p.set("q", qRaw.trim());
    const s = p.toString();
    return s ? `?${s}` : "";
  }, [segmentRaw, qRaw]);

  const { addItem, itemCount } = useCart();
  const { isSaved, toggleSaved } = useSaved();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [selectedConfig, setSelectedConfig] = useState("base");
  const [reviews, setReviews] = useState([]);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await getProductById(id);
        if (!cancelled) {
          setData(response);
          setReviews(Array.isArray(response?.reviews) ? response.reviews : []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.message || "Unable to load product details.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const product = data?.product;
  const similar = data?.similar || [];

  const visibleReviews = reviews.length > 0 ? reviews : FALLBACK_REVIEWS;
  const specRows = useMemo(() => productSpecsFor(product), [product]);

  usePageMeta({
    title: product?.title || "Product",
    description: product
      ? `${product.title} — ${formatMoney(product.price || 0)}. ${
          product.description || `Buy ${product.title} on SmartCart AI.`
        }`.slice(0, 200)
      : "Product details on SmartCart AI.",
  });

  /**
   * Build a schema.org Product JSON-LD object for the page so search
   * engines can render rich product snippets. Computed off the live
   * product + the user-submitted review list so price, stock and
   * ratings stay in sync.
   */
  const structuredData = useMemo(() => {
    if (!product) return null;
    const inrPrice = Number(product.price || 0).toFixed(2);
    const ratings = visibleReviews
      .map((r) => Number(r.rating))
      .filter((n) => Number.isFinite(n) && n > 0);
    const aggregateRating =
      ratings.length > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: (
              ratings.reduce((s, n) => s + n, 0) / ratings.length
            ).toFixed(2),
            reviewCount: ratings.length,
          }
        : product.rating
        ? {
            "@type": "AggregateRating",
            ratingValue: Number(product.rating).toFixed(2),
            reviewCount: product.reviewCount || 1,
          }
        : null;

    const json = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.title,
      description: product.description || `Buy ${product.title} on SmartCart AI.`,
      sku: product.id,
      brand: product.brand
        ? { "@type": "Brand", name: product.brand }
        : undefined,
      category: product.category || undefined,
      image: Array.isArray(product.images) && product.images.length > 0
        ? product.images
        : product.image
        ? [product.image]
        : undefined,
      offers: {
        "@type": "Offer",
        priceCurrency: "INR",
        price: inrPrice,
        availability:
          product.stock > 0
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
        url: typeof window !== "undefined" ? window.location.href : undefined,
      },
    };
    if (aggregateRating) json.aggregateRating = aggregateRating;
    return json;
  }, [product, visibleReviews]);

  useStructuredData(structuredData);

  /** Track this product as recently viewed once we've actually loaded it. */
  useEffect(() => {
    if (product?.id) trackViewedProduct(product);
  }, [product]);

  const handleReviewSubmit = async ({ rating, text }) => {
    if (!product?.id) return;
    try {
      const response = await createProductReview(product.id, { rating, text });
      if (response?.review) {
        setReviews((prev) => [response.review, ...prev]);
      }
      toast.success("Thanks for the review!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not submit your review");
    } finally {
      setReviewModalOpen(false);
    }
  };

  const gallery = useMemo(() => {
    const list = [product?.image, ...GALLERY_FALLBACKS].filter(Boolean);
    return Array.from(new Set(list));
  }, [product?.image]);

  const activeImage = gallery[activeImageIdx] || gallery[0];

  const unitPrice = useMemo(() => {
    if (!product) return 0;
    const base = Number(product.price || 0);
    // Pro tier upcharge — kept proportional to the previous USD upcharge
    // ($400 ≈ ₹33,000) so the demo price tier still feels meaningful.
    return selectedConfig === "pro" ? base + 33000 : base;
  }, [product, selectedConfig]);

  const configSubtitle =
    selectedConfig === "pro" ? "64GB RAM / 2TB SSD • Performance tier" : "32GB RAM / 1TB SSD • Standard tier";

  const stockCap =
    product && typeof product.stock === "number" && Number.isFinite(product.stock)
      ? product.stock
      : Infinity;
  const outOfStock = Boolean(product && stockCap < 1);
  const saved = product?.id != null && isSaved(product.id);

  const handleAddToCart = () => {
    if (!product) return;
    const cap =
      typeof product.stock === "number" && Number.isFinite(product.stock) ? product.stock : Infinity;
    if (cap < 1) return;
    addItem({
      productId: `${product.id}-${selectedConfig}`,
      title: product.title,
      image: product.image,
      subtitle: `${product.category || "Product"} • ${configSubtitle}`,
      unitPrice,
      stockAvailable: Number.isFinite(cap) ? cap : undefined,
    });
    toast.success(`Added ${product.title} to cart`);
  };

  if (loading) {
    return <ProductDetailSkeleton />;
  }

  if (error || !product) {
    return (
      <div className="product-page">
        <div className="product-error">
          <p>{error || "Product not found."}</p>
          <Link to={catalogListHref}>Back to catalog</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="product-page">
      <header className="product-topnav">
        <div className="product-topnav-inner">
          <Link to="/home" className="product-logo">
            SmartCart AI
          </Link>
          <div className="product-actions">
            <Link to="/cart" className="product-icon-btn product-icon-btn--cart" aria-label="Cart">
              <CartIcon size={22} />
              {itemCount > 0 ? (
                <span className="product-cart-badge">{itemCount > 99 ? "99+" : itemCount}</span>
              ) : null}
            </Link>
            <Link to="/profile" className="product-icon-btn product-profile-thumb" aria-label="Profile">
              <img src={DEFAULT_PROFILE_AVATAR} alt="" width={28} height={28} />
            </Link>
          </div>
        </div>
      </header>

      <main id="main-content" className="product-main">
        <section className="product-hero-grid">
          <div className="product-gallery">
            <div className="product-main-image-wrap">
              <img src={activeImage} alt={product.title} className="product-main-image" />
              <button
                type="button"
                className={`product-main-fav${saved ? " product-main-fav--saved" : ""}`}
                aria-label={saved ? "Remove from saved items" : "Save to profile"}
                onClick={() => toggleSaved(product)}
              >
                <HeartIcon filled={saved} size={20} />
              </button>
            </div>

            <div className="product-thumbs">
              {gallery.slice(0, 4).map((img, idx) => (
                <button
                  key={img}
                  type="button"
                  className={idx === activeImageIdx ? "thumb active" : "thumb"}
                  onClick={() => setActiveImageIdx(idx)}
                >
                  <img src={img} alt="" />
                </button>
              ))}
              <button type="button" className="thumb more">
                +4
              </button>
            </div>
          </div>

          <div className="product-buy">
            <Breadcrumbs
              className="product-breadcrumbs"
              items={[
                { label: "Home", to: "/home" },
                { label: "Catalog", to: "/catalog/products" },
                { label: product.category || "Products", to: catalogListHref },
                { label: product.title },
              ]}
            />

            <h1>{product.title}</h1>

            <div className="product-rating-line">
              <span className="stars">★★★★☆</span>
              <span>({product.reviewCount ?? 1248} reviews)</span>
            </div>

            {product && product.stock != null ? (
              <div className="product-stock-row">
                <StockBadge stock={product.stock} variant="block" />
              </div>
            ) : null}

            {product && product.stock != null && product.stock > 0 ? (
              <p className="product-delivery-line">
                <span aria-hidden="true">🚚</span>{" "}
                Get it by{" "}
                <strong>{formatDeliveryWindow(estimateDelivery(product.stock))}</strong>
                {" "}with SmartCart Express
              </p>
            ) : null}

            <div className="price-wrap">
              <div className="price-row">
                <strong>{formatMoney(product.price || 0)}</strong>
                <span className="old">{formatMoney(product.originalPrice || (product.price || 0) * 1.15)}</span>
                <span className="discount">-14%</span>
              </div>
              <p>Or {formatMoney((Number(product.price) || 0) / 12)}/mo for 12 months with SmartPay</p>
            </div>

            <div className="config-box">
              <h3>Choose Configuration</h3>
              <div className="config-grid">
                <button
                  type="button"
                  className={selectedConfig === "base" ? "config-btn active" : "config-btn"}
                  onClick={() => setSelectedConfig("base")}
                >
                  <span>32GB RAM / 1TB SSD</span>
                  <small>Standard Performance</small>
                </button>
                <button
                  type="button"
                  className={selectedConfig === "pro" ? "config-btn active" : "config-btn"}
                  onClick={() => setSelectedConfig("pro")}
                >
                  <span>64GB RAM / 2TB SSD</span>
                  <small>+{formatMoney(33000)}</small>
                </button>
              </div>
            </div>

            <div className="cta-stack">
              <button
                type="button"
                className="btn-primary btn-primary--with-cart-icon"
                onClick={handleAddToCart}
                disabled={outOfStock}
              >
                <CartIcon size={26} className="btn-primary-cart-img" />
                {outOfStock ? "Out of Stock" : "Add to Cart"}
              </button>
              {outOfStock ? (
                <StockAlertButton productId={product.id} variant="block" />
              ) : (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    handleAddToCart();
                    navigate("/cart");
                  }}
                >
                  Buy Now
                </button>
              )}
              {!outOfStock ? (
                <PriceDropAlertButton
                  productId={product.id}
                  productTitle={product.title}
                  currentPrice={product.price}
                  variant="block"
                />
              ) : null}
            </div>

            <div className="benefits">
              <div>
                <span>🚚</span>
                <p>FREE SHIPPING</p>
              </div>
              <div>
                <span>✅</span>
                <p>2YR WARRANTY</p>
              </div>
              <div>
                <span>↩</span>
                <p>30-DAY RETURNS</p>
              </div>
            </div>
          </div>
        </section>

        <section className="product-detail-grid">
          <div className="left-col">
            <article className="panel">
              <h2>Technical Specifications</h2>
              <div className="spec-grid">
                {specRows.length > 0 ? (
                  specRows.map(([key, value]) => (
                    <div key={key} className="spec-row">
                      <span>{key}</span>
                      <strong>{value}</strong>
                    </div>
                  ))
                ) : (
                  <p className="spec-empty">
                    Detailed specifications for this product are coming soon.
                  </p>
                )}
              </div>
            </article>

            <article className="panel">
              <div className="panel-head">
                <h2>Community Feedback</h2>
                <button type="button" onClick={() => setReviewModalOpen(true)}>
                  Write a review
                </button>
              </div>
              <div className="review-list">
                {visibleReviews.map((review) => {
                  const initials = getInitials(review.userName);
                  const ratingValue = Math.max(0, Math.min(5, Number(review.rating) || 0));
                  const stars = "★".repeat(ratingValue);
                  const when = formatRelativeDate(review.createdAt);
                  return (
                    <div key={review.id} className="review-item">
                      <div className="review-meta">
                        <span className="avatar">{initials}</span>
                        <div>
                          <p className="name">{review.userName}</p>
                          <p className="stars">
                            {stars}
                            {when ? <span className="review-time"> · {when}</span> : null}
                          </p>
                        </div>
                      </div>
                      <p className="review-text">{review.text}</p>
                    </div>
                  );
                })}
              </div>
            </article>
          </div>

          <div className="right-col">
            <article className="panel ai-panel">
              <h3>✦ Why It Suits You</h3>

              <div className="ai-card">
                <strong>Performance Match</strong>
                <p>
                  Based on your recent search for "Video Editing Workstations", this SKU offers about
                  40% speed boost over your current setup.
                </p>
              </div>
              <div className="ai-card">
                <strong>Value Insight</strong>
                <p>This is the lowest recorded price in the last 90 days. Predicted to rise soon.</p>
              </div>
              <div className="ai-card">
                <strong>Eco-Efficiency</strong>
                <p>Uses 15% less power than comparable models in your history under heavy load.</p>
              </div>

              <div className="quick-compare">
                <h4>Compare Quick-View</h4>
                {similar.map((item) => (
                  <Link to={`/catalog/products/${item.id}${detailQuerySuffix}`} key={item.id} className="quick-link">
                    <img src={item.image} alt="" />
                    <div>
                      <p>{item.title}</p>
                      <small>{formatMoney(item.price || 0)}</small>
                    </div>
                    <span>→</span>
                  </Link>
                ))}
              </div>
            </article>

            <article className="cert-card">
              <h4>⊛ SmartCart Certified</h4>
              <p>
                This product qualifies for AI-driven tech support and exclusive trade-in bonuses through
                SmartCart AI ecosystem.
              </p>
            </article>
          </div>
        </section>
        <RecentlyViewedStrip excludeId={product.id} title="Recently viewed" />
      </main>

      <HomeFooter />

      <ReviewModal
        open={reviewModalOpen}
        productTitle={product.title}
        onClose={() => setReviewModalOpen(false)}
        onSubmit={handleReviewSubmit}
      />
    </div>
  );
}

export default ProductDetail;
