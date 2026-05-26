import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bell } from "lucide-react";
import { Link } from "react-router-dom";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../api/client";
import { productDetailUrl } from "../constants/shopRoutes";
import { useToast } from "../hooks/useToast";
import {
  emitAlertsChanged,
  emitNotificationsChanged,
  onNotificationsChanged,
} from "../utils/alertEvents";
import { isAuthenticated, onAuthChange } from "../utils/authToken";
import "./ShopNotificationBell.css";

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

function applyAlertsCleared(alertsCleared) {
  if (!alertsCleared?.productId) return;
  if (alertsCleared.stock || alertsCleared.price) {
    emitAlertsChanged({ productId: alertsCleared.productId });
  }
}

export function ShopNotificationBell({ classPrefix = "shop" }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [authed, setAuthed] = useState(isAuthenticated());
  const wrapRef = useRef(null);
  const panelRef = useRef(null);
  const [panelStyle, setPanelStyle] = useState(null);

  const load = useCallback(async () => {
    if (!isAuthenticated()) {
      setItems([]);
      setUnread(0);
      return;
    }
    setLoading(true);
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
    setAuthed(isAuthenticated());
    return onAuthChange(() => {
      setAuthed(isAuthenticated());
      if (!isAuthenticated()) {
        setOpen(false);
        setItems([]);
        setUnread(0);
      }
    });
  }, []);

  useEffect(() => {
    if (!authed) return undefined;
    load();
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    const off = onNotificationsChanged(load);
    return () => {
      window.removeEventListener("focus", onFocus);
      off();
    };
  }, [authed, load]);

  useLayoutEffect(() => {
    if (!open || !wrapRef.current) {
      setPanelStyle(null);
      return;
    }
    const place = () => {
      const rect = wrapRef.current.getBoundingClientRect();
      const width = Math.min(380, window.innerWidth - 24);
      let left = rect.right - width;
      left = Math.max(12, Math.min(left, window.innerWidth - width - 12));
      const top = rect.bottom + 8;
      setPanelStyle({ top, left, width });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      const t = e.target;
      if (wrapRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!authed) return null;

  const markRead = async (id) => {
    try {
      const data = await markNotificationRead(id);
      setItems((prev) => prev.filter((n) => n.id !== id));
      setUnread((c) => Math.max(0, c - 1));
      applyAlertsCleared(data?.alertsCleared);
      emitNotificationsChanged();
    } catch {
      toast.error("Couldn't mark as read.");
    }
  };

  const markAll = async () => {
    try {
      const data = await markAllNotificationsRead();
      setItems((prev) => prev.filter((n) => n.read === true));
      setUnread(0);
      const ids = Array.isArray(data?.clearedProductIds) ? data.clearedProductIds : [];
      for (const productId of ids) {
        emitAlertsChanged({ productId });
      }
      emitNotificationsChanged();
    } catch {
      toast.error("Couldn't update notifications.");
    }
  };

  const unreadItems = items.filter((n) => !n.read);
  const recent = unreadItems.slice(0, 8);
  const prefix = classPrefix;
  const emptyDropdownMessage =
    items.length > 0 ? "No new notifications" : "No notifications yet.";

  return (
    <div className={`${prefix}-notify-wrap`} ref={wrapRef}>
      <button
        type="button"
        className={`${prefix}-icon-btn ${prefix}-icon-btn--notify`}
        aria-label={
          unread > 0
            ? `Notifications, ${unread} unread`
            : "Notifications"
        }
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((v) => !v)}
      >
        <Bell size={20} aria-hidden="true" />
        {unread > 0 ? (
          <span className={`${prefix}-notify-badge`} aria-hidden="true">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {open
        ? createPortal(
            <div
              ref={panelRef}
              className="shop-notify-panel"
              role="dialog"
              aria-label="Notifications"
              style={panelStyle || undefined}
            >
              <header className="shop-notify-panel-head">
                <strong>Notifications</strong>
                {unread > 0 ? (
                  <button type="button" className="shop-notify-mark-all" onClick={markAll}>
                    Mark all read
                  </button>
                ) : null}
              </header>

              {loading && recent.length === 0 ? (
                <p className="shop-notify-muted">Loading…</p>
              ) : recent.length === 0 ? (
                <p className="shop-notify-muted">{emptyDropdownMessage}</p>
              ) : (
                <ul className="shop-notify-list">
                  {recent.map((n) => (
                    <li
                      key={n.id}
                      className="shop-notify-item shop-notify-item--unread"
                    >
                      <div className="shop-notify-item-body">
                        <span className="shop-notify-item-title">{n.title}</span>
                        <p>{n.message}</p>
                        <time dateTime={n.createdAt}>{formatWhen(n.createdAt)}</time>
                      </div>
                      <div className="shop-notify-item-actions">
                        {n.productId ? (
                          <Link
                            to={productDetailUrl("AI Picks", n.productId)}
                            className="shop-notify-view"
                            onClick={() => setOpen(false)}
                          >
                            View
                          </Link>
                        ) : null}
                        <button
                          type="button"
                          className="shop-notify-read"
                          onClick={() => markRead(n.id)}
                        >
                          Mark read
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <footer className="shop-notify-panel-foot">
                <Link to="/profile/notifications" onClick={() => setOpen(false)}>
                  See all notifications
                </Link>
              </footer>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
