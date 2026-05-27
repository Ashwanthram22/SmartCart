import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../../api/client";
import { CATALOG_LIST_BASE, productDetailUrl } from "../../constants/shopRoutes";
import { useToast } from "../../hooks/useToast";
import {
  emitAlertsChanged,
  emitNotificationsChanged,
} from "../../utils/alertEvents";
import usePageMeta from "../../hooks/usePageMeta";
import CenteredLoader from "../../components/CenteredLoader";
import { ProfileLayout } from "./ProfileLayout";
import "./UserNotifications.css";

const FALLBACK_PRODUCT_IMAGE =
  "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?auto=format&fit=crop&w=200&q=80";

function formatWhen(iso) {
  const ts = Date.parse(iso);
  if (!ts) return "";
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function productImageForNotification(n) {
  const url = n?.productImage;
  return url && String(url).trim() ? String(url).trim() : FALLBACK_PRODUCT_IMAGE;
}

function productDetailLink(n) {
  if (!n?.productId) return null;
  const segment = n.productCategory || "AI Picks";
  return productDetailUrl(segment, n.productId);
}

export default function UserNotifications() {
  usePageMeta({
    title: "Notifications",
    description: "Alerts from SmartCart about products you follow.",
  });

  const toast = useToast();
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await getNotifications();
      setItems(Array.isArray(data?.notifications) ? data.notifications : []);
      setUnread(Number(data?.unread) || 0);
    } catch {
      setItems([]);
      setUnread(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const markRead = async (id) => {
    try {
      const data = await markNotificationRead(id);
      setItems((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnread((c) => Math.max(0, c - 1));
      const cleared = data?.alertsCleared;
      if (cleared?.productId && (cleared.stock || cleared.price)) {
        emitAlertsChanged({ productId: cleared.productId });
      }
      emitNotificationsChanged();
    } catch {
      toast.error("Couldn't mark as read.");
    }
  };

  const markAll = async () => {
    try {
      const data = await markAllNotificationsRead();
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnread(0);
      const ids = Array.isArray(data?.clearedProductIds) ? data.clearedProductIds : [];
      for (const productId of ids) {
        emitAlertsChanged({ productId });
      }
      emitNotificationsChanged();
      toast.success("All caught up.");
    } catch {
      toast.error("Couldn't update notifications.");
    }
  };

  return (
    <ProfileLayout>
      <div className="un-head">
        <h1>Notifications</h1>
        {unread > 0 ? (
          <button type="button" className="un-mark-all" onClick={markAll}>
            Mark all read
          </button>
        ) : null}
      </div>

      {loading ? (
        <CenteredLoader label="Loading notifications" compact />
      ) : items.length === 0 ? (
        <div className="un-empty">
          <Bell size={28} aria-hidden="true" />
          <p>No notifications yet.</p>
          <p className="un-muted">
            Use &quot;Notify when back in stock&quot; or &quot;Notify on price drop&quot; on a
            product — we&apos;ll post updates here when an admin responds.
          </p>
          <Link to={CATALOG_LIST_BASE} className="un-shop-link">
            Browse products
          </Link>
        </div>
      ) : (
        <ul className="un-list">
          {items.map((n) => {
            const detailTo = productDetailLink(n);
            const imgAlt = n.productTitle
              ? `${n.productTitle} product`
              : "Product";

            return (
              <li
                key={n.id}
                className={"un-item" + (n.read ? "" : " un-item--unread")}
              >
                {n.productId ? (
                  <div className="un-item-media">
                    <img
                      src={productImageForNotification(n)}
                      alt={imgAlt}
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                ) : null}

                <div className="un-item-content">
                  <h2 className="un-item-title">{n.title}</h2>
                  {n.productTitle ? (
                    <p className="un-item-product-name">{n.productTitle}</p>
                  ) : null}
                  <p className="un-item-message">{n.message}</p>
                  <time className="un-time" dateTime={n.createdAt}>
                    {formatWhen(n.createdAt)}
                  </time>
                </div>

                <div className="un-item-actions">
                  {detailTo ? (
                    <Link to={detailTo} className="un-btn un-btn--primary">
                      View
                    </Link>
                  ) : null}
                  {!n.read ? (
                    <button
                      type="button"
                      className="un-btn un-btn--ghost"
                      onClick={() => markRead(n.id)}
                    >
                      Mark read
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </ProfileLayout>
  );
}
