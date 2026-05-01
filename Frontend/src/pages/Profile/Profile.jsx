import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getCurrentUser } from "../../api/client";
import {
  DEFAULT_PROFILE_AVATAR,
  MOCK_PROFILE_EXTRA,
  MOCK_RECENT_ORDERS,
} from "../../data/profileDisplay";
import { ProfileLayout } from "./ProfileLayout";
import "./Profile.css";

function formatMoney(n) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function Profile() {
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

  return (
    <ProfileLayout>
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
          <Link to="/profile/orders" className="profile-view-all">
            View All <span aria-hidden="true">›</span>
          </Link>
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
    </ProfileLayout>
  );
}

export default Profile;
