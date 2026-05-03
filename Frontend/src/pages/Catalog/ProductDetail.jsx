import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useCart } from "../../hooks/useCart";
import { isValidSegment } from "../../constants/shopSegments";
import { DEFAULT_PROFILE_AVATAR } from "../../data/profileDisplay";
import { getProductById } from "../../api/client";
import HomeFooter from "../Home/HomeFooter";
import { CartIcon } from "../../components/CartIcon";
import "./ProductDetail.css";

const GALLERY_FALLBACKS = [
  "https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=800&q=80",
];

const REVIEWS = [
  {
    initials: "MS",
    name: "Marcus Sterling",
    rating: 5,
    text:
      "Thermal management is incredible. I rendered 4K footage for hours and fan noise stayed very low.",
  },
  {
    initials: "AL",
    name: "Anna Liang",
    rating: 4,
    text:
      "Excellent keyboard and screen quality. Great for development and long productivity sessions.",
  },
];

const SPECS = [
  ["Processor", "Intel Core i9-14900HK"],
  ["Graphics", "RTX 4090 Mobile 16GB"],
  ["Display", "16\" 4K OLED, 120Hz"],
  ["Battery", "99.9 Whr (12 hours)"],
  ["Weight", "1.8 kg (3.9 lbs)"],
  ["Ports", "3x TB4, HDMI 2.1"],
];

function ProductDetail() {
  const { id } = useParams();
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
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [selectedConfig, setSelectedConfig] = useState("base");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await getProductById(id);
        if (!cancelled) setData(response);
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

  const gallery = useMemo(() => {
    const list = [product?.image, ...GALLERY_FALLBACKS].filter(Boolean);
    return Array.from(new Set(list));
  }, [product?.image]);

  const activeImage = gallery[activeImageIdx] || gallery[0];

  const unitPrice = useMemo(() => {
    if (!product) return 0;
    const base = (product.price || 0) / 2.8;
    return selectedConfig === "pro" ? base + 400 : base;
  }, [product, selectedConfig]);

  const configSubtitle =
    selectedConfig === "pro" ? "64GB RAM / 2TB SSD • Performance tier" : "32GB RAM / 1TB SSD • Standard tier";

  const stockCap =
    product && typeof product.stock === "number" && Number.isFinite(product.stock)
      ? product.stock
      : Infinity;
  const outOfStock = Boolean(product && stockCap < 1);

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
  };

  if (loading) {
    return (
      <div className="product-page">
        <div className="product-loading">Loading product details...</div>
      </div>
    );
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

      <main className="product-main">
        <section className="product-hero-grid">
          <div className="product-gallery">
            <div className="product-main-image-wrap">
              <img src={activeImage} alt={product.title} className="product-main-image" />
              <span className="product-ai-chip">✦ AI RECOMMENDED</span>
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
            <nav className="product-breadcrumb" aria-label="Breadcrumb">
              <Link to={catalogListHref}>Products</Link>
              <span aria-hidden="true">›</span>
              <Link to={catalogListHref}>{product.category || "Catalog"}</Link>
              <span aria-hidden="true">›</span>
              <span>{product.title}</span>
            </nav>

            <h1>{product.title}</h1>

            <div className="product-rating-line">
              <span className="stars">★★★★☆</span>
              <span>({product.reviewCount ?? 1248} reviews)</span>
            </div>

            {Number.isFinite(stockCap) ? (
              <p className={`product-stock-line${stockCap < 1 ? " product-stock-line--out" : ""}`}>
                {stockCap < 1 ? "Out of stock" : `${stockCap} in stock`}
              </p>
            ) : null}

            <div className="price-wrap">
              <div className="price-row">
                <strong>${((product.price || 0) / 2.8).toFixed(2)}</strong>
                <span className="old">${(((product.originalPrice || product.price * 1.15) || 0) / 2.8).toFixed(2)}</span>
                <span className="discount">-14%</span>
              </div>
              <p>Or ${(product.price / 2.8 / 12).toFixed(2)}/mo for 12 months with SmartPay</p>
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
                  <small>+$400.00</small>
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
                Add to Cart
              </button>
              <button type="button" className="btn-secondary">Buy Now</button>
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
                {SPECS.map(([key, value]) => (
                  <div key={key} className="spec-row">
                    <span>{key}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
            </article>

            <article className="panel">
              <div className="panel-head">
                <h2>Community Feedback</h2>
                <button type="button">Write a review</button>
              </div>
              <div className="review-list">
                {REVIEWS.map((review) => (
                  <div key={review.name} className="review-item">
                    <div className="review-meta">
                      <span className="avatar">{review.initials}</span>
                      <div>
                        <p className="name">{review.name}</p>
                        <p className="stars">{Array.from({ length: review.rating }).map(() => "★").join("")}</p>
                      </div>
                    </div>
                    <p className="review-text">{review.text}</p>
                  </div>
                ))}
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
                      <small>${((item.price || 0) / 2.8).toFixed(2)}</small>
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
      </main>

      <HomeFooter />

      <button type="button" className="product-floating-ai" aria-label="Ask AI">
        <span>🤖</span>
        <div>Ask AI Assistant about this product</div>
      </button>
    </div>
  );
}

export default ProductDetail;
