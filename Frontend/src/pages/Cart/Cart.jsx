import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../../hooks/useCart";
import { ShopTopNav } from "../../components/ShopTopNav";
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
  const firstCartProductTitle = items.find((i) => i.productId !== UPSLEEVE_ID)?.title;

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
      <header className="shop-topnav-shell">
        <ShopTopNav searchPlaceholder="Search products..." cartActive />
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
            <Link to="/catalog/products" className="cart-empty-cta">
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="cart-layout">
            <div className="cart-col cart-col--items">
              {items.map((line) => {
                const maxQty =
                  typeof line.stockAvailable === "number" && Number.isFinite(line.stockAvailable)
                    ? line.stockAvailable
                    : Infinity;
                return (
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
                          disabled={line.quantity >= maxQty}
                          onClick={() => setQuantity(line.productId, line.quantity + 1)}
                        >
                          +
                        </button>
                      </div>
                      <button type="button" className="cart-remove" onClick={() => removeItem(line.productId)}>
                        <svg
                          className="cart-remove-icon"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          aria-hidden="true"
                        >
                          <path
                            d="M4 7h16M10 11v6m4-6v6M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M7 7l1 12a2 2 0 0 0 2 1.9h4a2 2 0 0 0 2-1.9l1-12"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        <span className="cart-remove-label">Remove</span>
                      </button>
                    </div>
                  </div>
                </article>
              );
              })}

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
                        {firstCartProductTitle ? ` for your ${firstCartProductTitle}` : " for your setup"}.
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
                <button type="button" className="cart-checkout-btn" onClick={() => navigate("/checkout")}>
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
            </aside>
          </div>
        )}
      </main>

      <HomeFooter />
    </div>
  );
}

export default Cart;
