import { useEffect, useState } from "react";
import { Bell, Check } from "lucide-react";
import {
  getStockAlerts,
  subscribeStockAlert,
  unsubscribeStockAlert,
} from "../api/client";
import { useToast } from "../hooks/useToast";
import { isAuthenticated, onAuthChange } from "../utils/authToken";
import "./StockAlertButton.css";

/**
 * Module-level cache of the most recent /stock-alerts response so a
 * catalog page with multiple OOS cards doesn't fan-out N identical
 * GETs on first paint. Cleared on auth change.
 */
let alertsPromise = null;
function loadAlertsOnce() {
  if (!alertsPromise) {
    alertsPromise = getStockAlerts()
      .then((data) => Array.isArray(data?.alerts) ? data.alerts : [])
      .catch(() => []);
  }
  return alertsPromise;
}
function invalidateAlertsCache() {
  alertsPromise = null;
}
onAuthChange(invalidateAlertsCache);

/**
 * "Notify me when back in stock" subscription button.
 *
 * Designed to live next to (or replace) the Add-to-cart button when a
 * product's stock is 0. Resolves the user's existing subscription state
 * lazily on mount so the button can render the correct label/icon
 * without needing parent state.
 *
 * Props:
 *   - productId   (required) — backend product id
 *   - variant     "inline" (default, small chip) | "block" (full button)
 *   - onChange    optional callback fired with the new subscribed state
 */
export default function StockAlertButton({ productId, variant = "inline", onChange }) {
  const toast = useToast();
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!productId || !isAuthenticated()) {
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      const alerts = await loadAlertsOnce();
      if (cancelled) return;
      setSubscribed(
        alerts.some((a) => String(a.productId) === String(productId))
      );
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [productId]);

  const handleClick = async (e) => {
    e.stopPropagation();
    if (busy || loading) return;

    if (!isAuthenticated()) {
      toast.info("Sign in to get a notification when this is back in stock.");
      return;
    }

    setBusy(true);
    try {
      if (subscribed) {
        await unsubscribeStockAlert(productId);
        invalidateAlertsCache();
        setSubscribed(false);
        onChange?.(false);
        toast.info("Notification turned off.");
      } else {
        await subscribeStockAlert(productId);
        invalidateAlertsCache();
        setSubscribed(true);
        onChange?.(true);
        toast.success("We'll email you when this is back in stock.");
      }
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Couldn't update your notification."
      );
    } finally {
      setBusy(false);
    }
  };

  const label = subscribed ? "We'll notify you" : "Notify when back in stock";
  const Icon = subscribed ? Check : Bell;

  return (
    <button
      type="button"
      className={`stock-alert-btn stock-alert-btn--${variant}${
        subscribed ? " stock-alert-btn--on" : ""
      }`}
      onClick={handleClick}
      disabled={busy || loading || !productId}
      aria-pressed={subscribed}
    >
      <Icon size={variant === "block" ? 16 : 14} aria-hidden="true" />
      <span>{loading ? "…" : label}</span>
    </button>
  );
}
