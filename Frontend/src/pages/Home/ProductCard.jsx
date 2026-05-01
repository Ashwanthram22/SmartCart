import { useNavigate } from "react-router-dom";
import { useCart } from "../../hooks/useCart";
import { CartIcon } from "../../components/CartIcon";

/** Product shape matches API / CDN mapping later: image field should be full Cloudinary URL */
function ProductCard({ product, showAskAi = false }) {
  const navigate = useNavigate();
  const { addItem } = useCart();
  const {
    id,
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

  const openDetail = () => {
    if (id) navigate(`/catalog/laptops/${id}`);
  };

  const handleCardKeyDown = (event) => {
    if (!id) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openDetail();
    }
  };

  const unitPrice = (Number(price) || 0) / 2.8;

  const handleAddToCart = (event) => {
    event.stopPropagation();
    if (!id) return;
    addItem({
      productId: id,
      title,
      image: imgSrc,
      subtitle: `${category || "Electronics"} • ${rating ?? "—"}★ rated`,
      unitPrice,
    });
  };

  return (
    <article
      className="home-product-card"
      role={id ? "button" : undefined}
      tabIndex={id ? 0 : undefined}
      onClick={openDetail}
      onKeyDown={handleCardKeyDown}
    >
      <div className="home-product-card-image-wrap">
        <img src={imgSrc} alt="" className="home-product-card-img" loading="lazy" />
        {badge ? <span className="home-product-badge">{badge}</span> : null}
        <button
          type="button"
          className="home-product-fav"
          aria-label="Add to favorites"
          onClick={(e) => e.stopPropagation()}
        >
          ♡
        </button>
        {showAskAi ? (
          <button
            type="button"
            className="home-product-ask-ai"
            onClick={(e) => e.stopPropagation()}
          >
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
        <button
          type="button"
          className="home-product-cart-btn"
          aria-label="Add to cart"
          onClick={handleAddToCart}
          disabled={!id}
        >
          <CartIcon size={26} className="home-product-cart-icon" />
        </button>
      </div>
    </article>
  );
}

export default ProductCard;
