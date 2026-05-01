import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getCurrentUser } from "../../api/client";
import {
  DEFAULT_PROFILE_AVATAR,
  MOCK_PROFILE_EXTRA,
  MOCK_RECENT_ORDERS,
} from "../../data/profileDisplay";
import { useCart } from "../../hooks/useCart";
import { clearToken } from "../../utils/authToken";
import "./Profile.css";

function formatMoney(n) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function Profile() {
  const navigate = useNavigate();
  const { itemCount } = useCart();
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await getCurrentUser();
        if (!cancelled) setUser(data.user);
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoadingUser(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const displayName = user?.name || "SmartCart member";
  const email = user?.email || "—";

  const handleLogout = () => {
    clearToken();
    navigate("/login", { replace: true });
  };

  return (
    <div className="profile-page">
      <header className="profile-topnav">
        <div className="profile-topnav-inner">
          <Link to="/home" className="profile-logo">
            SmartCart AI
          </Link>
          <nav className="profile-topnav-links" aria-label="Primary">
            <Link to="/catalog/laptops">Categories</Link>
            <a href="#">Deals</a>
            <a href="#">Support</a>
          </nav>
          <div className="profile-topnav-actions">
            <Link to="/cart" className="profile-nav-icon profile-nav-icon--cart" aria-label="Cart">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
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
              {itemCount > 0 ? (
                <span className="profile-nav-badge">{itemCount > 99 ? "99+" : itemCount}</span>
              ) : null}
            </Link>
            <button type="button" className="profile-nav-icon" aria-label="Notifications">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 22a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2ZM18 16v-5a6 6 0 0 0-12 0v5l-2 2h16l-2-2Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <Link to="/profile" className="profile-nav-avatar-wrap" aria-label="Profile" aria-current="page">
              <img src={DEFAULT_PROFILE_AVATAR} alt="" className="profile-nav-avatar" />
            </Link>
          </div>
        </div>
      </header>

      <main className="profile-main">
        <aside className="profile-sidebar">
          <nav className="profile-side-card" aria-label="Account">
            <Link to="/profile" className="profile-side-link profile-side-link--active">
              <span className="profile-side-icon" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
                  <path
                    d="M6 20v-1a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v1"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              My Profile
            </Link>
            <a href="#" className="profile-side-link">
              <span className="profile-side-icon" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" stroke="currentColor" strokeWidth="2" />
                </svg>
              </span>
              Order History
            </a>
            <a href="#" className="profile-side-link">
              <span className="profile-side-icon" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" stroke="currentColor" strokeWidth="2" />
                </svg>
              </span>
              Security
            </a>
            <a href="#" className="profile-side-link">
              <span className="profile-side-icon" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 21s-6-4.35-6-10a6 6 0 1 1 12 0c0 5.65-6 10-6 10Z"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                </svg>
              </span>
              Saved Items
            </a>
            <hr className="profile-side-rule" />
            <button type="button" className="profile-side-link profile-side-link--logout" onClick={handleLogout}>
              <span className="profile-side-icon" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </span>
              Logout
            </button>
          </nav>

          <div className="profile-insight-card">
            <div className="profile-insight-head">
              <span aria-hidden="true">✦</span>
              <span>Smart Insight</span>
            </div>
            <p>
              Based on your recent browsing, you might save $40 this month by using SmartCart&apos;s personalized
              deals.
            </p>
          </div>
        </aside>

        <section className="profile-content">
          <div className="profile-bento">
            <div className="profile-hero-card">
              <img src={DEFAULT_PROFILE_AVATAR} alt="" className="profile-hero-avatar" />
              <div className="profile-hero-text">
                {loadingUser ? (
                  <div className="profile-skeleton profile-skeleton--title" />
                ) : (
                  <>
                    <h1>{displayName}</h1>
                    <p className="profile-hero-status">{MOCK_PROFILE_EXTRA.memberSinceLabel}</p>
                    <div className="profile-badges">
                      <span className="profile-badge">Smart Shopper</span>
                      <span className="profile-badge profile-badge--alt">Early Adopter</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="profile-loyalty-card">
              <span className="profile-loyalty-watermark" aria-hidden="true">
                ✓
              </span>
              <div>
                <p className="profile-loyalty-label">Loyalty Points</p>
                <p className="profile-loyalty-value">{MOCK_PROFILE_EXTRA.loyaltyPoints}</p>
              </div>
              <button type="button" className="profile-loyalty-btn">
                Redeem Rewards
              </button>
            </div>
          </div>

          <div className="profile-panel">
            <div className="profile-panel-head">
              <h2>Personal Information</h2>
              <button type="button" className="profile-panel-edit">
                Edit Details
              </button>
            </div>
            <div className="profile-info-grid">
              <div>
                <p className="profile-field-label">Full Name</p>
                <p className="profile-field-value">{loadingUser ? "…" : displayName}</p>
              </div>
              <div>
                <p className="profile-field-label">Email Address</p>
                <p className="profile-field-value">{loadingUser ? "…" : email}</p>
              </div>
              <div>
                <p className="profile-field-label">Phone Number</p>
                <p className="profile-field-value">{MOCK_PROFILE_EXTRA.phone}</p>
              </div>
              <div>
                <p className="profile-field-label">Primary Address</p>
                <p className="profile-field-value">{MOCK_PROFILE_EXTRA.address}</p>
              </div>
            </div>
          </div>

          <div className="profile-orders-section">
            <div className="profile-orders-head">
              <h2>Recent Orders</h2>
              <a href="#" className="profile-view-all">
                View All <span aria-hidden="true">›</span>
              </a>
            </div>
            <ul className="profile-order-list">
              {MOCK_RECENT_ORDERS.map((order) => (
                <li key={order.id} className="profile-order-row">
                  <div className="profile-order-thumb">
                    <img src={order.image} alt="" />
                  </div>
                  <div className="profile-order-body">
                    <div className="profile-order-top">
                      <h3>{order.title}</h3>
                      <span className="profile-order-price">{formatMoney(order.price)}</span>
                    </div>
                    <p className="profile-order-meta">
                      Order #{order.id} • {order.dateLabel}
                    </p>
                    <div className="profile-order-status">
                      <span
                        className={
                          order.status === "delivered"
                            ? "profile-status-dot profile-status-dot--green"
                            : "profile-status-dot profile-status-dot--amber"
                        }
                      />
                      <span
                        className={
                          order.status === "delivered"
                            ? "profile-status-text profile-status-text--green"
                            : "profile-status-text profile-status-text--amber"
                        }
                      >
                        {order.status === "delivered" ? "Delivered" : "In Transit"}
                      </span>
                    </div>
                  </div>
                  <button type="button" className="profile-track-btn">
                    Track
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <nav className="profile-bottom-nav" aria-label="Mobile">
        <Link to="/home" className="profile-bottom-link">
          <span aria-hidden="true">⌂</span>
          Home
        </Link>
        <Link to="/catalog/laptops" className="profile-bottom-link">
          <span aria-hidden="true">▣</span>
          Shop
        </Link>
        <a href="#" className="profile-bottom-link">
          <span aria-hidden="true">☰</span>
          Orders
        </a>
        <Link to="/profile" className="profile-bottom-link profile-bottom-link--active">
          <span aria-hidden="true">◉</span>
          Profile
        </Link>
      </nav>
    </div>
  );
}

export default Profile;
