import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { SHOP_SEGMENTS } from "../../constants/shopSegments";
import { CATALOG_LIST_BASE, productDetailUrl } from "../../constants/shopRoutes";
import {
  getAddresses,
  getCurrentUser,
  getOrders,
  updateCurrentUser,
  userGetUploadSignature,
} from "../../api/client";
import { DEFAULT_PROFILE_AVATAR } from "../../data/profileDisplay";
import { useToast } from "../../hooks/useToast";
import usePageMeta from "../../hooks/usePageMeta";
import Skeleton from "../../components/Skeleton";
import EditProfileDialog from "./EditProfileDialog";
import { ProfileLayout } from "./ProfileLayout";
import { formatMoney } from "../../utils/money";
import "./Profile.css";

const PROFILE_MAX_UPLOAD_MB = 5;
const PROFILE_MAX_UPLOAD_BYTES = PROFILE_MAX_UPLOAD_MB * 1024 * 1024;

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

function segmentForOrderLine(line) {
  const raw = line?.subtitle?.split("•")[0]?.trim();
  if (!raw) return "AI Picks";
  const match = SHOP_SEGMENTS.find(
    (seg) => seg.toLowerCase() === raw.toLowerCase()
  );
  return match || "AI Picks";
}

function productDetailHref(line) {
  if (!line?.productId) return null;
  return productDetailUrl(segmentForOrderLine(line), line.productId);
}

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
  const [primaryAddress, setPrimaryAddress] = useState(null);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef(null);
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

  useEffect(() => {
    let cancelled = false;
    async function loadAddresses() {
      try {
        const data = await getAddresses();
        const list = Array.isArray(data?.addresses) ? data.addresses : [];
        if (!cancelled) {
          const preferred =
            list.find((a) => a.isDefault) || list[0] || null;
          setPrimaryAddress(preferred);
        }
      } catch {
        if (!cancelled) setPrimaryAddress(null);
      } finally {
        if (!cancelled) setLoadingAddresses(false);
      }
    }
    loadAddresses();
    return () => {
      cancelled = true;
    };
  }, []);

  const displayName = user?.name || "SmartCart member";
  const email = user?.email || "—";
  const avatarSrc = user?.avatar || DEFAULT_PROFILE_AVATAR;

  const handleProfileSave = async ({ name }) => {
    const res = await updateCurrentUser({ name });
    if (res?.user) setUser(res.user);
    toast.success("Profile updated.");
  };

  const openAvatarPicker = () => {
    if (avatarUploading) return;
    avatarInputRef.current?.click();
  };

  const handleAvatarSelected = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      event.target.value = "";
      return;
    }
    if (file.size > PROFILE_MAX_UPLOAD_BYTES) {
      toast.error(`Image must be ${PROFILE_MAX_UPLOAD_MB} MB or smaller.`);
      event.target.value = "";
      return;
    }

    setAvatarUploading(true);
    try {
      const sig = await userGetUploadSignature();
      if (!sig?.signature || !sig?.uploadUrl || !sig?.apiKey) {
        throw new Error("Upload is not configured on backend.");
      }
      const fd = new FormData();
      fd.append("file", file);
      fd.append("api_key", sig.apiKey);
      fd.append("timestamp", String(sig.timestamp));
      fd.append("signature", sig.signature);
      if (sig.folder) fd.append("folder", sig.folder);

      const response = await fetch(sig.uploadUrl, { method: "POST", body: fd });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error?.message || "Cloudinary rejected the upload.");
      }
      const json = await response.json();
      const nextAvatar = String(json?.secure_url || "").trim();
      if (!nextAvatar) throw new Error("Cloudinary did not return an image URL.");

      const updated = await updateCurrentUser({ avatar: nextAvatar });
      if (updated?.user) setUser(updated.user);
      toast.success("Profile photo updated.");
    } catch (err) {
      toast.error(err?.message || "Could not upload profile photo.");
    } finally {
      setAvatarUploading(false);
      event.target.value = "";
    }
  };

  return (
    <ProfileLayout>
      <div className="profile-bento">
        <div className="profile-hero-card">
          {loadingUser ? (
            <Skeleton
              width={96}
              height={96}
              radius={999}
              className="profile-hero-avatar-skel"
              ariaLabel="Loading profile photo"
            />
          ) : (
            <div className="profile-hero-avatar-wrap">
              <img src={avatarSrc} alt="" className="profile-hero-avatar" />
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={handleAvatarSelected}
              />
              <button
                type="button"
                className="profile-hero-avatar-edit"
                onClick={openAvatarPicker}
                disabled={avatarUploading}
                title={avatarUploading ? "Uploading…" : "Change photo"}
                aria-label={avatarUploading ? "Uploading profile photo" : "Change profile photo"}
              >
                {avatarUploading ? "…" : "Edit"}
              </button>
            </div>
          )}
          <div className="profile-hero-text">
            {loadingUser ? (
              <div className="profile-hero-skeleton" aria-busy="true" aria-label="Loading profile">
                <Skeleton height={30} width={220} radius={8} />
                <Skeleton height={18} width={150} radius={6} className="profile-hero-skeleton-role" />
              </div>
            ) : (
              <>
                <h1>{displayName}</h1>
                <p className="profile-hero-status">
                  {user?.role === "admin" ? "Administrator" : "SmartCart member"}
                </p>
              </>
            )}
          </div>
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
            {loadingUser ? (
              <Skeleton height={18} width="72%" radius={6} className="profile-field-skeleton" />
            ) : (
              <p className="profile-field-value">{displayName}</p>
            )}
          </div>
          <div>
            <p className="profile-field-label">Email Address</p>
            {loadingUser ? (
              <Skeleton height={18} width="85%" radius={6} className="profile-field-skeleton" />
            ) : (
              <p className="profile-field-value">{email}</p>
            )}
          </div>
          <div className="profile-field profile-field--address">
            <p className="profile-field-label">Primary Address</p>
            {loadingAddresses ? (
              <div
                className="profile-address-skeleton"
                aria-busy="true"
                aria-label="Loading address"
              >
                <Skeleton height={18} width="92%" radius={6} />
                <Skeleton height={18} width="68%" radius={6} className="profile-address-skeleton-line" />
              </div>
            ) : (
              <>
                <p className="profile-field-value">
                  {primaryAddress
                    ? [
                        primaryAddress.line1,
                        primaryAddress.line2,
                        primaryAddress.city,
                        primaryAddress.postal,
                      ]
                        .filter(Boolean)
                        .join(", ")
                    : "No address saved yet"}
                </p>
                {!primaryAddress ? (
                  <Link to="/profile/addresses" className="profile-field-link">
                    Add an address
                  </Link>
                ) : null}
              </>
            )}
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
          <p className="profile-skeleton sc-skeleton-surface profile-skeleton--title" />
        ) : orders.length === 0 ? (
          <div className="profile-orders-empty">
            <p>You haven&apos;t placed any orders yet.</p>
            <Link to={CATALOG_LIST_BASE} className="profile-orders-empty-cta">
              Start shopping
            </Link>
          </div>
        ) : (
          <ul className="profile-order-list">
            {orders.map((order) => {
              const headline = order.items?.[0];
              const productHref = productDetailHref(headline);
              return (
                <li key={order.id} className="profile-order-row">
                  {productHref ? (
                    <Link
                      to={productHref}
                      className="profile-order-thumb profile-order-product-link"
                      aria-label={`View ${headline?.title || "product"}`}
                    >
                      {headline?.image ? (
                        <img src={headline.image} alt="" loading="lazy" />
                      ) : null}
                    </Link>
                  ) : (
                    <div className="profile-order-thumb">
                      {headline?.image ? (
                        <img src={headline.image} alt="" loading="lazy" />
                      ) : null}
                    </div>
                  )}
                  <div className="profile-order-body">
                    <h3>
                      {productHref ? (
                        <Link
                          to={productHref}
                          className="profile-order-title-link"
                        >
                          {headline?.title || "Order"}
                        </Link>
                      ) : (
                        headline?.title || "Order"
                      )}
                    </h3>
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
                  <div className="profile-order-aside">
                    <span className="profile-order-price">
                      {formatMoney(order.total)}
                    </span>
                    <Link to="/profile/orders" className="profile-track-btn">
                      View
                    </Link>
                  </div>
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
