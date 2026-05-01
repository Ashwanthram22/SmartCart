/** Product shape matches API / CDN mapping later: image field should be full Cloudinary URL */
function ProductCard({ product, showAskAi = false }) {
  const {
    title,
    category,
    price,
    originalPrice,
    rating,
    reviewCount,
    badge,
    image,
  } = product;

  const imgSrc =
    image ||
    "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?auto=format&fit=crop&w=600&q=80";

  const reviewsShort =
    typeof reviewCount === "number"
      ? reviewCount >= 1000
        ? `${(reviewCount / 1000).toFixed(1)}k`
        : String(reviewCount)
      : "0";

  return (
    <article className="home-product-card">
      <div className="home-product-card-image-wrap">
        <img src={imgSrc} alt="" className="home-product-card-img" loading="lazy" />
        {badge ? <span className="home-product-badge">{badge}</span> : null}
        <button type="button" className="home-product-fav" aria-label="Add to favorites">
          ♡
        </button>
        {showAskAi ? (
          <button type="button" className="home-product-ask-ai">
            <span aria-hidden="true">✦</span> Ask AI Assistant
          </button>
        ) : null}
      </div>
      <div className="home-product-card-body">
        <p className="home-product-category">{category || "Electronics"}</p>
        <h3 className="home-product-title">{title}</h3>
        <div className="home-product-price-row">
          <span className="home-product-price">Rs. {price?.toLocaleString?.("en-IN") ?? price}</span>
          {originalPrice ? (
            <span className="home-product-price-old">
              Rs. {originalPrice.toLocaleString("en-IN")}
            </span>
          ) : null}
        </div>
        <div className="home-product-meta">
          <span className="home-product-stars">★ {rating ?? "—"}</span>
          <span className="home-product-reviews">({reviewsShort})</span>
        </div>
        <button type="button" className="home-product-cart-btn" aria-label="Add to cart">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M6 6h15l-1.5 9h-12L6 6zm0 0L5 3H2"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </article>
  );
}

export default ProductCard;
