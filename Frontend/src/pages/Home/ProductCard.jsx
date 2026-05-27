import { useNavigate } from "react-router-dom";
import { useCart } from "../../hooks/useCart";
import { useSaved } from "../../hooks/useSaved";
import { useAssistant } from "../../hooks/useAssistant";
import { CartIcon } from "../../components/CartIcon";
import { HeartIcon } from "../../components/HeartIcon";
import { formatMoney } from "../../utils/money";
import { getCatalogGridImageProps } from "../../utils/catalogImage";
import { productDetailUrl } from "../../constants/shopRoutes";

/** Product shape matches API / CDN mapping later: image field should be full Cloudinary URL */
function ProductCard({ product, showAskAi = false, badgeOverride, index = 0 }) {
  const navigate = useNavigate();
  const { open: openAssistant } = useAssistant();
  const { addItem } = useCart();
  const { isSaved, toggleSaved } = useSaved();
  const {
    id,
    title,
    category,
    price,
    originalPrice,
    rating,
    reviewCount,
    image,
    badge,
  } = product;
  const saved = id ? isSaved(id) : false;

  const displayBadge = badgeOverride ?? badge ?? null;
  const isTrendingBadge =
    !!displayBadge && String(displayBadge).toUpperCase().includes("TRENDING");

  const imgSrc =
    image ||
    "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?auto=format&fit=crop&w=600&q=80";

  const gridImg = getCatalogGridImageProps(imgSrc, { index });
  const reviewsShort =
    typeof reviewCount === "number"
      ? reviewCount >= 1000
        ? `${(reviewCount / 1000).toFixed(1)}k`
        : String(reviewCount)
      : "0";

  const openDetail = () => {
    if (id) navigate(productDetailUrl("AI Picks", id, ""));
  };

  const handleCardKeyDown = (event) => {
    if (!id) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openDetail();
    }
  };

  const unitPrice = Number(price) || 0;
  const stockNum = Number(product.stock);
  const outOfStock = Number.isFinite(stockNum) && stockNum < 1;

  const handleAddToCart = (event) => {
    event.stopPropagation();
    if (!id || outOfStock) return;
    addItem({ ...product, image: imgSrc, price: unitPrice });
  };

  const handleAskAiClick = (event) => {
    event.stopPropagation();
    if (!id) return;
    openAssistant({
      productId: id,
      productTitle: title,
      productCategory: category || "",
      productPrice: price,
      productImage: imgSrc,
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
      <div className="home-product-card-media">
        <img alt="" className="home-product-card-img" {...gridImg} />
        {displayBadge ? (
          <span
            className={`home-product-badge${
              isTrendingBadge ? " home-product-badge--trending" : ""
            }`}
          >
            {isTrendingBadge ? <span aria-hidden="true">↗</span> : null}
            {String(displayBadge).replace(/^[↗↑]\s*/, "")}
          </span>
        ) : null}
        <button
          type="button"
          className={`home-product-fav${saved ? " home-product-fav--saved" : ""}`}
          aria-label={saved ? "Remove from saved items" : "Save to profile"}
          onClick={(e) => {
            e.stopPropagation();
            if (id) toggleSaved(product);
          }}
        >
          <HeartIcon filled={saved} size={18} />
        </button>
        {showAskAi ? (
          <button
            type="button"
            className="home-product-ask-ai"
            aria-label={`Ask AI Assistant about ${title}`}
            onClick={handleAskAiClick}
          >
            <span aria-hidden="true">✦</span> Ask AI Assistant
          </button>
        ) : null}
      </div>
      <div className="home-product-card-details">
        <p className="home-product-category">{category || "Electronics"}</p>
        <h3 className="home-product-title">{title}</h3>
      </div>
      <div className="home-product-card-foot">
        <div className="home-product-foot-main">
          <div className="home-product-price-row">
            <span className="home-product-price">{formatMoney(price)}</span>
            {originalPrice ? (
              <span className="home-product-price-old">
                {formatMoney(originalPrice)}
              </span>
            ) : null}
          </div>
          <div className="home-product-meta">
            <span className="home-product-stars">★ {rating ?? "—"}</span>
            <span className="home-product-reviews">({reviewsShort})</span>
          </div>
        </div>
        <button
          type="button"
          className="home-product-cart-btn"
          aria-label="Add to cart"
          onClick={handleAddToCart}
          disabled={!id || outOfStock}
        >
          <CartIcon size={26} className="home-product-cart-icon" />
        </button>
      </div>
    </article>
  );
}

export default ProductCard;
