import { Link, useNavigate } from "react-router-dom";
import { DEFAULT_PROFILE_AVATAR } from "../../data/profileDisplay";
import { clearToken } from "../../utils/authToken";
import { useCart } from "../../hooks/useCart";
import HomeFooter from "../Home/HomeFooter";
import "./Cart.css";

const TAX_RATE = 0.08;
const UPSLEEVE_ID = "ai-upsell-sleeve-13";
const UPSLEEVE_PRICE = 39.2;
const UPSLEEVE_IMAGE =
  "https://images.unsplash.com/photo-1544816155-12df96455549?auto=format&fit=crop&w=400&q=80";

function formatMoney(n) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function Cart() {
  const navigate = useNavigate();
  const { items, setQuantity, removeItem, addItem, itemCount } = useCart();

  const subtotal = items.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  const estimatedTax = subtotal * TAX_RATE;
  const total = subtotal + estimatedTax;
  const hasUpsell = items.some((i) => i.productId === UPSLEEVE_ID);
  const firstLaptopTitle = items.find((i) => i.productId !== UPSLEEVE_ID)?.title;

  const handleLogout = () => {
    clearToken();
    navigate("/login", { replace: true });
  };

  const addSleeveUpsell = () => {
    if (hasUpsell) return;
    addItem({
      productId: UPSLEEVE_ID,
      title: "SmartSleeve 13",
      image: UPSLEEVE_IMAGE,
      subtitle: "Premium felt sleeve • Charcoal gray",
      unitPrice: UPSLEEVE_PRICE,
      quantity: 1,
    });
  };

  return (
    <div className="cart-page">
      <header className="cart-topnav">
        <div className="cart-topnav-inner">
          <div className="cart-brand-nav">
            <Link to="/home" className="cart-logo">
              SmartCart AI
            </Link>
            <nav className="cart-main-links" aria-label="Secondary">
              <a href="#">History</a>
              <a href="#">Recommendations</a>
              <a href="#">Compare</a>
            </nav>
          </div>
          <div className="cart-actions">
            <Link to="/cart" className="cart-icon-btn cart-icon-btn--cart active" aria-label="Cart" aria-current="page">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M6 6h15l-1.5 9h-12L6 6zm0 0L5 3H2"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="9" cy="20" r="1.5" fill="currentColor" />
                <circle cx="18" cy="20" r="1.5" fill="currentColor" />
              </svg>
              {itemCount > 0 ? <span className="cart-nav-badge">{itemCount > 99 ? "99+" : itemCount}</span> : null}
            </Link>
            <Link to="/profile" className="cart-icon-btn cart-profile-thumb" aria-label="Profile">
              <img src={DEFAULT_PROFILE_AVATAR} alt="" width={28} height={28} />
            </Link>
          </div>
        </div>
      </header>

      <main className="cart-main">
        <div className="cart-intro">
          <h1>Shopping Cart</h1>
          {items.length === 0 ? (
            <p className="cart-intro-sub">
              Your cart is empty. Browse the catalog and tap “Add to cart” on any product.
            </p>
          ) : (
            <p className="cart-intro-sub">
              You have {itemCount} {itemCount === 1 ? "item" : "items"} in your cart. AI has optimized your selection
              for compatibility.
            </p>
          )}
        </div>

        {items.length === 0 ? (
          <div className="cart-empty">
            <Link to="/catalog/laptops" className="cart-empty-cta">
              Browse laptops
            </Link>
          </div>
        ) : (
          <div className="cart-layout">
            <div className="cart-col cart-col--items">
              {items.map((line) => (
                <article key={line.productId} className="cart-item-card">
                  <div className="cart-item-media">
                    <img src={line.image} alt={line.title} />
                  </div>
                  <div className="cart-item-body">
                    <div className="cart-item-top">
                      <div>
                        <h2 className="cart-item-title">{line.title}</h2>
                        <p className="cart-item-sub">{line.subtitle}</p>
                      </div>
                      <p className="cart-item-price">
                        {formatMoney(line.unitPrice)}
                        {line.quantity > 1 ? (
                          <span className="cart-item-price-meta"> × {line.quantity}</span>
                        ) : null}
                      </p>
                    </div>
                    <div className="cart-item-controls">
                      <div className="cart-qty" role="group" aria-label={`Quantity for ${line.title}`}>
                        <button
                          type="button"
                          className="cart-qty-btn"
                          aria-label="Decrease quantity"
                          onClick={() => setQuantity(line.productId, line.quantity - 1)}
                        >
                          −
                        </button>
                        <span className="cart-qty-value">{line.quantity}</span>
                        <button
                          type="button"
                          className="cart-qty-btn"
                          aria-label="Increase quantity"
                          onClick={() => setQuantity(line.productId, line.quantity + 1)}
                        >
                          +
                        </button>
                      </div>
                      <button type="button" className="cart-remove" onClick={() => removeItem(line.productId)}>
                        <span className="cart-remove-icon" aria-hidden="true">
                          🗑
                        </span>
                        Remove
                      </button>
                    </div>
                  </div>
                </article>
              ))}

              {!hasUpsell ? (
                <div className="cart-ai-suggestion">
                  <div className="cart-ai-glow" aria-hidden="true" />
                  <div className="cart-ai-inner">
                    <div className="cart-ai-thumb">
                      <img src={UPSLEEVE_IMAGE} alt="" />
                    </div>
                    <div className="cart-ai-copy">
                      <div className="cart-ai-badge">
                        <span aria-hidden="true">✨</span>
                        AI Optimization Suggestion
                      </div>
                      <h3>Add this to complete your setup</h3>
                      <p>
                        The SmartSleeve 13 is specifically designed
                        {firstLaptopTitle ? ` for your ${firstLaptopTitle}` : " for 13\" laptops"}.
                        Get it now for 20% off with your current order.
                      </p>
                    </div>
                    <button type="button" className="cart-ai-add-btn" onClick={addSleeveUpsell}>
                      Add for {formatMoney(UPSLEEVE_PRICE)}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <aside className="cart-col cart-col--summary">
              <div className="cart-summary-card">
                <h2 className="cart-summary-title">Order Summary</h2>
                <ul className="cart-summary-rows">
                  <li>
                    <span>Subtotal</span>
                    <strong>{formatMoney(subtotal)}</strong>
                  </li>
                  <li>
                    <span>Shipping</span>
                    <strong className="cart-summary-free">Free</strong>
                  </li>
                  <li>
                    <span>Estimated Tax</span>
                    <strong>{formatMoney(estimatedTax)}</strong>
                  </li>
                </ul>
                <div className="cart-summary-total">
                  <span>Total</span>
                  <strong>{formatMoney(total)}</strong>
                </div>
                <button type="button" className="cart-checkout-btn">
                  Proceed to Checkout
                  <span aria-hidden="true">→</span>
                </button>
                <p className="cart-summary-footnote">Tax calculated at checkout. Secure SSL encrypted payment.</p>
              </div>

              <div className="cart-guarantee-card">
                <span className="cart-guarantee-icon" aria-hidden="true">
                  🛡
                </span>
                <div>
                  <p className="cart-guarantee-title">SmartCart Guarantee</p>
                  <p className="cart-guarantee-text">
                    If these products don&apos;t integrate perfectly, we offer 100% free returns for 60 days.
                  </p>
                </div>
              </div>

              <button type="button" className="cart-logout-btn" onClick={handleLogout}>
                Log out
              </button>
            </aside>
          </div>
        )}
      </main>

      <HomeFooter />
    </div>
  );
}

export default Cart;
