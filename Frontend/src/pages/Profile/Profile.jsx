import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getCurrentUser, getOrders, updateCurrentUser } from "../../api/client";
import {
  DEFAULT_PROFILE_AVATAR,
  MOCK_PROFILE_EXTRA,
} from "../../data/profileDisplay";
import { useToast } from "../../hooks/useToast";
import usePageMeta from "../../hooks/usePageMeta";
import EditProfileDialog from "./EditProfileDialog";
import { ProfileLayout } from "./ProfileLayout";
import { formatMoney } from "../../utils/money";
import "./Profile.css";

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const STATUS_LABEL = {
  processing: "Processing",
  transit: "In Transit",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

function Profile() {
  usePageMeta({
    title: "My profile",
    description: "Your SmartCart AI account at a glance — orders, loyalty and personal details.",
  });

  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const toast = useToast();

  useEffect(() => {
    let cancelled = false;
    async function loadUser() {
      try {
        const data = await getCurrentUser();
        if (!cancelled) setUser(data.user);
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoadingUser(false);
      }
    }
    loadUser();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadOrders() {
      try {
        const data = await getOrders();
        if (!cancelled) {
          setOrders(Array.isArray(data?.orders) ? data.orders.slice(0, 3) : []);
        }
      } catch {
        if (!cancelled) setOrders([]);
      } finally {
        if (!cancelled) setLoadingOrders(false);
      }
    }
    loadOrders();
    return () => {
      cancelled = true;
    };
  }, []);

  const displayName = user?.name || "SmartCart member";
  const email = user?.email || "—";

  const handleProfileSave = async ({ name }) => {
    const res = await updateCurrentUser({ name });
    if (res?.user) setUser(res.user);
    toast.success("Profile updated.");
  };

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
                <p className="profile-hero-status">
                  {MOCK_PROFILE_EXTRA.memberSinceLabel}
                </p>
                <div className="profile-badges">
                  <span className="profile-badge">Smart Shopper</span>
                  <span className="profile-badge profile-badge--alt">Early Adopter</span>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="profile-loyalty-card">
          <span className="profile-loyalty-watermark" aria-hidden="true">✓</span>
          <div>
            <p className="profile-loyalty-label">Loyalty Points</p>
            <p className="profile-loyalty-value">{MOCK_PROFILE_EXTRA.loyaltyPoints}</p>
          </div>
          <button
            type="button"
            className="profile-loyalty-btn"
            onClick={() => toast.info("Rewards redemption launches soon.")}
          >
            Redeem Rewards
          </button>
        </div>
      </div>

      <div className="profile-panel">
        <div className="profile-panel-head">
          <h2>Personal Information</h2>
          <button
            type="button"
            className="profile-panel-edit"
            onClick={() => setEditOpen(true)}
          >
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

        {loadingOrders ? (
          <p className="profile-skeleton profile-skeleton--title" />
        ) : orders.length === 0 ? (
          <div className="profile-orders-empty">
            <p>You haven&apos;t placed any orders yet.</p>
            <Link to="/catalog/products" className="profile-orders-empty-cta">
              Start shopping
            </Link>
          </div>
        ) : (
          <ul className="profile-order-list">
            {orders.map((order) => {
              const headline = order.items?.[0];
              return (
                <li key={order.id} className="profile-order-row">
                  <div className="profile-order-thumb">
                    {headline?.image ? <img src={headline.image} alt="" /> : null}
                  </div>
                  <div className="profile-order-body">
                    <div className="profile-order-top">
                      <h3>{headline?.title || "Order"}</h3>
                      <span className="profile-order-price">
                        {formatMoney(order.total)}
                      </span>
                    </div>
                    <p className="profile-order-meta">
                      Order #{order.id} • {formatDate(order.createdAt)}
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
                        {STATUS_LABEL[order.status] || "Processing"}
                      </span>
                    </div>
                  </div>
                  <Link
                    to="/profile/orders"
                    className="profile-track-btn"
                  >
                    View
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <EditProfileDialog
        open={editOpen}
        user={user}
        onClose={() => setEditOpen(false)}
        onSubmit={handleProfileSave}
      />
    </ProfileLayout>
  );
}

export default Profile;
