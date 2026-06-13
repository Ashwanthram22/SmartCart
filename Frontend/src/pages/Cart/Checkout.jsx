import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { CATALOG_LIST_BASE } from "../../constants/shopRoutes";
import { Loader2 } from "lucide-react";
import { useCart } from "../../hooks/useCart";
import {
  createAddress,
  createOrder,
  getAddresses,
  validateCoupon,
} from "../../api/client";
import HomeFooter from "../Home/HomeFooter";
import usePageMeta from "../../hooks/usePageMeta";
import Skeleton from "../../components/Skeleton";
import { formatMoney } from "../../utils/money";
import { cartLineTitle, cartLineUnitPrice } from "../../utils/cartLine";
import "./Checkout.css";

const TAX_RATE = 0.08;

const EMPTY_FORM = {
  label: "Home",
  fullName: "",
  line1: "",
  line2: "",
  city: "",
  postal: "",
  phone: "",
};

function isValidForm(form) {
  return (
    form.fullName.trim().length >= 2 &&
    form.line1.trim().length >= 2 &&
    form.city.trim().length >= 2 &&
    form.postal.trim().length >= 2
  );
}

export default function Checkout() {
  const { items, clearCart, syncCartToServer } = useCart();
  const location = useLocation();

  usePageMeta({
    title: "Checkout",
    description: "Place your SmartCart AI order securely.",
  });

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [confirmedOrder, setConfirmedOrder] = useState(null);

  // Address book state
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [mode, setMode] = useState("picker"); // "picker" | "form"
  const [form, setForm] = useState(EMPTY_FORM);
  const [saveToBook, setSaveToBook] = useState(true);
  const [addrError, setAddrError] = useState("");

  // Coupon state — code arrives via location.state from the cart page;
  // we re-validate it here so the totals shown match what the server will
  // actually charge.
  const couponCodeFromCart = location.state?.couponCode || "";
  const [couponPreview, setCouponPreview] = useState(null);
  const [couponError, setCouponError] = useState("");

  const subtotal = useMemo(
    () =>
      items.reduce(
        (s, l) => s + (Number(l.product?.price ?? l.unitPrice) || 0) * l.quantity,
        0
      ),
    [items]
  );
  const discount = couponPreview
    ? Math.min(subtotal, Number(couponPreview.discount) || 0)
    : 0;
  const taxable = Math.max(0, subtotal - discount);
  const tax = taxable * TAX_RATE;
  const grandTotal = taxable + tax;

  // Pull saved addresses on mount; auto-default to the user's default
  // address if they have one, otherwise drop into the empty-form mode.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { addresses } = await getAddresses();
        if (cancelled) return;
        const list = Array.isArray(addresses) ? addresses : [];
        setSavedAddresses(list);
        if (list.length > 0) {
          const defaultAddr = list.find((a) => a.isDefault) || list[0];
          setSelectedAddressId(defaultAddr.id);
          setMode("picker");
        } else {
          setMode("form");
        }
      } catch {
        if (!cancelled) setMode("form");
      } finally {
        if (!cancelled) setLoadingAddresses(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Re-validate the cart-side coupon against the real subtotal.
  useEffect(() => {
    if (!couponCodeFromCart || subtotal <= 0) {
      setCouponPreview(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await validateCoupon({ code: couponCodeFromCart, subtotal });
        if (cancelled) return;
        setCouponPreview({
          code: res.coupon.code,
          label: res.coupon.label,
          discount: res.discount,
        });
        setCouponError("");
      } catch (err) {
        if (cancelled) return;
        setCouponPreview(null);
        setCouponError(
          err.response?.data?.message ||
            `Coupon ${couponCodeFromCart} could not be applied.`
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [couponCodeFromCart, subtotal]);

  const updateForm = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const selectedAddress = useMemo(
    () => savedAddresses.find((a) => a.id === selectedAddressId) || null,
    [savedAddresses, selectedAddressId]
  );

  const canContinue =
    mode === "form"
      ? isValidForm(form)
      : Boolean(selectedAddress);

  const handleContinue = async () => {
    setAddrError("");
    if (mode === "form" && saveToBook) {
      try {
        const { address } = await createAddress({
          ...form,
          isDefault: savedAddresses.length === 0,
        });
        setSavedAddresses((prev) => {
          const next = [...prev];
          if (address.isDefault) {
            for (const a of next) a.isDefault = false;
          }
          next.push(address);
          return next;
        });
        setSelectedAddressId(address.id);
        setMode("picker");
      } catch (err) {
        setAddrError(
          err.response?.data?.message || "Could not save the address. Try again."
        );
        return;
      }
    }
    setStep(2);
  };

  const placeOrder = async () => {
    setSubmitting(true);
    setError("");
    const address = mode === "form" ? form : selectedAddress;
    if (!address) {
      setError("Please pick a shipping address.");
      setSubmitting(false);
      return;
    }
    try {
      await syncCartToServer();
      const response = await createOrder({
        address: {
          fullName: address.fullName,
          line1: address.line1,
          city: address.city,
          postal: address.postal,
        },
        couponCode: couponPreview ? couponPreview.code : undefined,
      });
      setConfirmedOrder(response?.order || null);
      clearCart();
      setStep(3);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Could not place your order. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
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
        <main id="main-content" className="checkout-main">
          <section className="checkout-card">
            <p className="checkout-empty-msg">Your cart is empty.</p>
            <Link to={CATALOG_LIST_BASE} className="checkout-btn-primary">
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
        <ol className="checkout-steps" aria-label="Checkout progress">
          {[
            { n: 1, label: "Address" },
            { n: 2, label: "Payment" },
            { n: 3, label: "Done" },
          ].map(({ n, label }) => {
            const allDone = step === 3;
            const done = allDone || step > n;
            const current = !allDone && step === n;
            return (
              <li
                key={label}
                className={
                  "checkout-step" +
                  (done ? " checkout-step--done" : "") +
                  (current ? " checkout-step--current" : "")
                }
                aria-current={current ? "step" : undefined}
              >
                <span className="checkout-step-dot" aria-hidden="true">
                  {done ? "✓" : n}
                </span>
                <span className="checkout-step-text">{label}</span>
              </li>
            );
          })}
        </ol>
      </header>

      <main id="main-content" className="checkout-main checkout-main--wide">
        <div className="checkout-grid">
          <div className="checkout-col">
            {step === 1 ? (
              <section className="checkout-card">
                <h1 className="checkout-title">Shipping address</h1>

                {loadingAddresses ? (
                  <ul className="checkout-addr-list checkout-addr-list--skel" aria-busy="true" aria-label="Loading addresses">
                    {Array.from({ length: 2 }).map((_, i) => (
                      <li key={`addr-sk-${i}`} className="checkout-addr-card checkout-addr-card--skel">
                        <div className="checkout-addr-skel-head">
                          <Skeleton height={18} width="45%" radius={6} />
                          <Skeleton height={14} width={56} radius={999} />
                        </div>
                        <Skeleton height={14} width="92%" radius={4} className="checkout-addr-skel-line" />
                        <Skeleton height={14} width="70%" radius={4} className="checkout-addr-skel-line" />
                      </li>
                    ))}
                  </ul>
                ) : null}

                {!loadingAddresses && savedAddresses.length > 0 && mode === "picker" ? (
                  <ul className="checkout-addr-list">
                    {savedAddresses.map((a) => {
                      const isSel = a.id === selectedAddressId;
                      return (
                        <li
                          key={a.id}
                          className={`checkout-addr-card${isSel ? " checkout-addr-card--sel" : ""}`}
                        >
                          <label className="checkout-addr-label">
                            <input
                              type="radio"
                              name="ship-addr"
                              checked={isSel}
                              onChange={() => setSelectedAddressId(a.id)}
                            />
                            <div className="checkout-addr-body">
                              <p className="checkout-addr-head">
                                <strong>{a.fullName}</strong>
                                <span className="checkout-addr-tag">{a.label}</span>
                                {a.isDefault ? (
                                  <span className="checkout-addr-default">Default</span>
                                ) : null}
                              </p>
                              <p className="checkout-addr-line">{a.line1}</p>
                              {a.line2 ? (
                                <p className="checkout-addr-line">{a.line2}</p>
                              ) : null}
                              <p className="checkout-addr-line">
                                {a.city}, {a.postal}
                              </p>
                              {a.phone ? (
                                <p className="checkout-addr-line">{a.phone}</p>
                              ) : null}
                            </div>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}

                {mode === "form" ? (
                  <>
                    {savedAddresses.length > 0 ? (
                      <button
                        type="button"
                        className="checkout-secondary-btn"
                        onClick={() => setMode("picker")}
                      >
                        ← Pick a saved address instead
                      </button>
                    ) : null}
                    <div className="checkout-fields">
                      <label className="checkout-field">
                        Address label
                        <input
                          value={form.label}
                          onChange={updateForm("label")}
                          placeholder="Home, Work, Mom's place"
                        />
                      </label>
                      <label className="checkout-field">
                        Full name
                        <input
                          value={form.fullName}
                          onChange={updateForm("fullName")}
                          autoComplete="name"
                          placeholder="Jane Doe"
                        />
                      </label>
                      <label className="checkout-field">
                        Address line
                        <input
                          value={form.line1}
                          onChange={updateForm("line1")}
                          autoComplete="street-address"
                          placeholder="123 Smart Cart Blvd"
                        />
                      </label>
                      <div className="checkout-field-row">
                        <label className="checkout-field">
                          City
                          <input
                            value={form.city}
                            onChange={updateForm("city")}
                            autoComplete="address-level2"
                          />
                        </label>
                        <label className="checkout-field">
                          Postal code
                          <input
                            value={form.postal}
                            onChange={updateForm("postal")}
                            autoComplete="postal-code"
                          />
                        </label>
                      </div>
                      <label className="checkout-checkbox">
                        <input
                          type="checkbox"
                          checked={saveToBook}
                          onChange={(e) => setSaveToBook(e.target.checked)}
                        />
                        Save this address to my address book
                      </label>
                    </div>
                  </>
                ) : null}

                {addrError ? <p className="checkout-error">{addrError}</p> : null}

                <div className="checkout-addr-actions">
                  {mode === "picker" && savedAddresses.length > 0 ? (
                    <button
                      type="button"
                      className="checkout-secondary-btn"
                      onClick={() => {
                        setForm(EMPTY_FORM);
                        setMode("form");
                      }}
                    >
                      + Use a new address
                    </button>
                  ) : null}

                  <button
                    type="button"
                    className="checkout-btn-primary"
                    disabled={!canContinue}
                    onClick={handleContinue}
                  >
                    Continue to payment
                  </button>
                </div>
              </section>
            ) : null}

            {step === 2 ? (
              <section className="checkout-card">
                <h1 className="checkout-title">Payment</h1>
                <p className="checkout-mock-note">
                  Demo checkout — no real card is charged.
                </p>
                <div className="checkout-mock-card">
                  <span className="checkout-mock-card-title">
                    Visa ending in 4242
                  </span>
                  <small className="checkout-mock-card-sub">
                    Mock payment method · expires 12/30
                  </small>
                </div>
                {error ? <p className="checkout-error">{error}</p> : null}
                <div className="checkout-actions">
                  <button
                    type="button"
                    className="checkout-btn-secondary"
                    onClick={() => setStep(1)}
                    disabled={submitting}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    className="checkout-btn-primary"
                    onClick={placeOrder}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="checkout-btn-spinner" size={18} aria-hidden="true" />
                        Placing order…
                      </>
                    ) : (
                      `Place order · ${formatMoney(grandTotal)}`
                    )}
                  </button>
                </div>
              </section>
            ) : null}

            {step === 3 ? (
              <section className="checkout-card checkout-success">
                <h1 className="checkout-title">Thank you!</h1>
                <p className="checkout-success-text">
                  Your order is confirmed.
                  {confirmedOrder?.id ? (
                    <>
                      {" "}
                      Reference <strong>#{confirmedOrder.id}</strong>.
                    </>
                  ) : null}{" "}
                  You can track its progress from your profile.
                </p>
                {confirmedOrder?.total != null ? (
                  <p className="checkout-success-text">
                    Total charged:{" "}
                    <strong>{formatMoney(confirmedOrder.total)}</strong>
                  </p>
                ) : null}
                <div className="checkout-actions">
                  <Link to="/profile/orders" className="checkout-btn-secondary">
                    View orders
                  </Link>
                  <Link to="/home" className="checkout-btn-primary">
                    Continue shopping
                  </Link>
                </div>
              </section>
            ) : null}
          </div>

          {step < 3 ? (
            <aside className="checkout-summary">
              <h2 className="checkout-summary-title">Order summary</h2>
              <ul className="checkout-summary-items">
                {items.slice(0, 4).map((line) => (
                  <li key={line.productId} className="checkout-summary-item">
                    <span className="checkout-summary-item-name">
                      {cartLineTitle(line)}
                      <span className="checkout-summary-item-qty"> × {line.quantity}</span>
                    </span>
                    <span>{formatMoney(cartLineUnitPrice(line) * line.quantity)}</span>
                  </li>
                ))}
                {items.length > 4 ? (
                  <li className="checkout-summary-item checkout-summary-item--more">
                    + {items.length - 4} more item{items.length - 4 === 1 ? "" : "s"}
                  </li>
                ) : null}
              </ul>
              <dl className="checkout-summary-totals">
                <div>
                  <dt>Subtotal</dt>
                  <dd>{formatMoney(subtotal)}</dd>
                </div>
                {couponPreview ? (
                  <div className="checkout-summary-discount">
                    <dt>
                      Coupon
                      <small>{couponPreview.code}</small>
                    </dt>
                    <dd>−{formatMoney(discount)}</dd>
                  </div>
                ) : null}
                {couponError ? (
                  <p className="checkout-summary-coupon-err">{couponError}</p>
                ) : null}
                <div>
                  <dt>Tax</dt>
                  <dd>{formatMoney(tax)}</dd>
                </div>
                <div>
                  <dt>Shipping</dt>
                  <dd>Free</dd>
                </div>
                <div className="checkout-summary-grand">
                  <dt>Total</dt>
                  <dd>{formatMoney(grandTotal)}</dd>
                </div>
              </dl>
            </aside>
          ) : null}
        </div>
      </main>

      <HomeFooter />
    </div>
  );
}
