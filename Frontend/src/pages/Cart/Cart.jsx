import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { useCart } from "../../hooks/useCart";
import { useToast } from "../../hooks/useToast";
import { ShopTopNav } from "../../components/ShopTopNav";
import StockBadge from "../../components/StockBadge";
import HomeFooter from "../Home/HomeFooter";
import { validateCoupon } from "../../api/client";
import usePageMeta from "../../hooks/usePageMeta";
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
  const toast = useToast();

  usePageMeta({
    title: "Shopping cart",
    description: "Review the items in your SmartCart AI cart and check out securely.",
  });

  const [couponInput, setCouponInput] = useState("");
  const [applied, setApplied] = useState(null);
  const [couponBusy, setCouponBusy] = useState(false);
  const [couponError, setCouponError] = useState("");

  const subtotal = items.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  const discount = applied
    ? Math.min(subtotal, Number(applied.discount) || 0)
    : 0;
  const taxable = Math.max(0, subtotal - discount);
  const estimatedTax = taxable * TAX_RATE;
  const total = taxable + estimatedTax;

  const applyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    setCouponBusy(true);
    setCouponError("");
    try {
      const res = await validateCoupon({ code, subtotal });
      setApplied({
        code: res.coupon.code,
        label: res.coupon.label,
        type: res.coupon.type,
        value: res.coupon.value,
        discount: res.discount,
      });
      setCouponInput("");
      toast.success(`${res.coupon.label} applied — you saved $${res.discount.toFixed(2)}.`);
    } catch (err) {
      setCouponError(err.response?.data?.message || "Could not apply that coupon");
    } finally {
      setCouponBusy(false);
    }
  };

  const removeCoupon = () => {
    setApplied(null);
    setCouponError("");
  };

  const goToCheckout = () => {
    navigate("/checkout", {
      state: applied ? { couponCode: applied.code } : undefined,
    });
  };

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
    toast.success("SmartSleeve 13 added to your cart.");
  };

  const handleRemove = (line) => {
    removeItem(line.productId);
    toast.show({
      message: `Removed ${line.title}`,
      variant: "info",
      action: {
        label: "Undo",
        onClick: () =>
          addItem({
            productId: line.productId,
            title: line.title,
            image: line.image,
            subtitle: line.subtitle,
            unitPrice: line.unitPrice,
            quantity: line.quantity,
            stockAvailable: line.stockAvailable,
          }),
      },
    });
  };

  return (
    <div className="cart-page">
      <header className="shop-topnav-shell">
        <ShopTopNav searchPlaceholder="Search products..." cartActive />
      </header>

      <main id="main-content" className="cart-main">
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
                        {line.stockAvailable != null ? (
                          <div className="cart-item-stock">
                            <StockBadge stock={line.stockAvailable} />
                          </div>
                        ) : null}
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
                      <button
                        type="button"
                        className="cart-remove"
                        onClick={() => handleRemove(line)}
                      >
                        <Trash2 size={16} className="cart-remove-icon" aria-hidden="true" />
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
                  {applied ? (
                    <li className="cart-summary-discount">
                      <span>
                        Coupon
                        <small className="cart-summary-coupon-tag">{applied.code}</small>
                      </span>
                      <strong>−{formatMoney(discount)}</strong>
                    </li>
                  ) : null}
                  <li>
                    <span>Estimated Tax</span>
                    <strong>{formatMoney(estimatedTax)}</strong>
                  </li>
                </ul>

                <div className="cart-coupon">
                  {applied ? (
                    <div className="cart-coupon-applied">
                      <div>
                        <p className="cart-coupon-label">{applied.label}</p>
                        <p className="cart-coupon-saved">
                          You saved {formatMoney(discount)}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="cart-coupon-remove"
                        onClick={removeCoupon}
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="cart-coupon-row">
                        <input
                          type="text"
                          value={couponInput}
                          onChange={(e) => setCouponInput(e.target.value)}
                          placeholder="Enter coupon code"
                          aria-label="Coupon code"
                          className="cart-coupon-input"
                          disabled={couponBusy || items.length === 0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              applyCoupon();
                            }
                          }}
                        />
                        <button
                          type="button"
                          className="cart-coupon-apply"
                          disabled={couponBusy || !couponInput.trim() || items.length === 0}
                          onClick={applyCoupon}
                        >
                          {couponBusy ? "…" : "Apply"}
                        </button>
                      </div>
                      {couponError ? (
                        <p className="cart-coupon-error">{couponError}</p>
                      ) : (
                        <p className="cart-coupon-hint">
                          Try <code>WELCOME10</code>, <code>AICART</code>, or <code>SAVE25</code>.
                        </p>
                      )}
                    </>
                  )}
                </div>

                <div className="cart-summary-total">
                  <span>Total</span>
                  <strong>{formatMoney(total)}</strong>
                </div>
                <button
                  type="button"
                  className="cart-checkout-btn"
                  onClick={goToCheckout}
                >
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
