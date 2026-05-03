import { useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../../hooks/useCart";
import HomeFooter from "../Home/HomeFooter";
import "./Checkout.css";

export default function Checkout() {
  const { items, clearCart } = useCart();
  const [step, setStep] = useState(1);
  const [address, setAddress] = useState({
    fullName: "",
    line1: "",
    city: "",
    postal: "",
  });

  const updateAddr = (field) => (e) => setAddress((a) => ({ ...a, [field]: e.target.value }));

  const canContinueAddr =
    address.fullName.trim() &&
    address.line1.trim() &&
    address.city.trim() &&
    address.postal.trim();

  const placeOrder = () => {
    clearCart();
    setStep(3);
  };

  if (items.length === 0 && step < 3) {
    return (
      <div className="checkout-page">
        <header className="checkout-header">
          <Link to="/cart" className="checkout-back">
            ← Back to cart
          </Link>
          <Link to="/home" className="checkout-brand">
            SmartCart AI
          </Link>
        </header>
        <main className="checkout-main">
          <section className="checkout-card">
            <p className="checkout-empty-msg">Your cart is empty.</p>
            <Link to="/catalog/products" className="checkout-btn-primary">
              Browse products
            </Link>
          </section>
        </main>
        <HomeFooter />
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <header className="checkout-header">
        <Link to="/cart" className="checkout-back">
          ← Back to cart
        </Link>
        <Link to="/home" className="checkout-brand">
          SmartCart AI
        </Link>
        <span className="checkout-step-label">Step {step} of 3</span>
      </header>

      <main className="checkout-main">
        {step === 1 ? (
          <section className="checkout-card">
            <h1 className="checkout-title">Shipping address</h1>
            <div className="checkout-fields">
              <label className="checkout-field">
                Full name
                <input
                  value={address.fullName}
                  onChange={updateAddr("fullName")}
                  autoComplete="name"
                  placeholder="Jane Doe"
                />
              </label>
              <label className="checkout-field">
                Address line
                <input
                  value={address.line1}
                  onChange={updateAddr("line1")}
                  autoComplete="street-address"
                  placeholder="123 Smart Cart Blvd"
                />
              </label>
              <div className="checkout-field-row">
                <label className="checkout-field">
                  City
                  <input value={address.city} onChange={updateAddr("city")} autoComplete="address-level2" />
                </label>
                <label className="checkout-field">
                  Postal code
                  <input value={address.postal} onChange={updateAddr("postal")} autoComplete="postal-code" />
                </label>
              </div>
            </div>
            <button
              type="button"
              className="checkout-btn-primary"
              disabled={!canContinueAddr}
              onClick={() => setStep(2)}
            >
              Continue to payment
            </button>
          </section>
        ) : null}

        {step === 2 ? (
          <section className="checkout-card">
            <h1 className="checkout-title">Payment</h1>
            <p className="checkout-mock-note">Demo checkout — no real card is charged.</p>
            <div className="checkout-mock-card">
              <span className="checkout-mock-card-title">Visa ending in 4242</span>
              <small className="checkout-mock-card-sub">Mock payment method · expires 12/30</small>
            </div>
            <div className="checkout-actions">
              <button type="button" className="checkout-btn-secondary" onClick={() => setStep(1)}>
                Back
              </button>
              <button type="button" className="checkout-btn-primary" onClick={placeOrder}>
                Place order
              </button>
            </div>
          </section>
        ) : null}

        {step === 3 ? (
          <section className="checkout-card checkout-success">
            <h1 className="checkout-title">Thank you!</h1>
            <p className="checkout-success-text">
              Your order is confirmed. You&apos;ll receive a confirmation email shortly (demo — no email is sent).
            </p>
            <Link to="/home" className="checkout-btn-primary">
              Continue shopping
            </Link>
          </section>
        ) : null}
      </main>

      <HomeFooter />
    </div>
  );
}
