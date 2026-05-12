import { useEffect, useRef, useState } from "react";
import { TrendingDown, Check, X } from "lucide-react";
import {
  getPriceAlerts,
  subscribePriceAlert,
  unsubscribePriceAlert,
} from "../api/client";
import { useToast } from "../hooks/useToast";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { isAuthenticated, onAuthChange } from "../utils/authToken";
import "./PriceDropAlertButton.css";

/**
 * Module-level cache for the price alerts list. Mirrors the pattern in
 * StockAlertButton — multiple instances on a page (e.g. catalog) only
 * trigger one GET, and we invalidate on auth changes / mutations.
 */
let alertsPromise = null;
function loadAlertsOnce() {
  if (!alertsPromise) {
    alertsPromise = getPriceAlerts()
      .then((data) => (Array.isArray(data?.alerts) ? data.alerts : []))
      .catch(() => []);
  }
  return alertsPromise;
}
function invalidateAlertsCache() {
  alertsPromise = null;
}
onAuthChange(invalidateAlertsCache);

function PriceTargetDialog({ open, productTitle, currentPrice, onClose, onSubmit, busy }) {
  const dialogRef = useRef(null);
  useFocusTrap(dialogRef, open);
  const initialTarget =
    Number.isFinite(currentPrice) && currentPrice > 0
      ? Math.max(1, Math.round(currentPrice * 0.9 * 100) / 100)
      : "";
  const [value, setValue] = useState(String(initialTarget));
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!open) return;
    setValue(String(initialTarget));
    setErr("");
  }, [open, initialTarget]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const submit = (e) => {
    e.preventDefault();
    const num = Number(value);
    if (!Number.isFinite(num) || num <= 0) {
      setErr("Enter a target price greater than $0.");
      return;
    }
    if (Number.isFinite(currentPrice) && num >= currentPrice) {
      setErr("Target price must be lower than the current price.");
      return;
    }
    onSubmit(num);
  };

  return (
    <div className="pda-overlay" role="presentation" onClick={onClose}>
      <div
        ref={dialogRef}
        className="pda-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pda-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="pda-head">
          <h2 id="pda-title" className="pda-title">
            Notify me when the price drops
          </h2>
          <button type="button" className="pda-close" onClick={onClose} aria-label="Close">
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        <p className="pda-subtitle">
          We'll alert you when <strong>{productTitle}</strong> drops to your target
          price or below.
          {Number.isFinite(currentPrice) ? (
            <>
              <br />
              Current price:{" "}
              <strong>${(currentPrice / 2.8).toFixed(2)}</strong>
            </>
          ) : null}
        </p>
        <form className="pda-form" onSubmit={submit} noValidate>
          <label className="pda-field">
            <span>Target price (USD)</span>
            <div className="pda-input-wrap">
              <span className="pda-input-prefix" aria-hidden="true">$</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  if (err) setErr("");
                }}
                autoFocus
              />
            </div>
          </label>
          {err ? (
            <p className="pda-error" role="alert">
              {err}
            </p>
          ) : null}
          <div className="pda-actions">
            <button type="button" className="pda-secondary" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="pda-primary" disabled={busy}>
              {busy ? "Saving…" : "Set price alert"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * Floating "Notify me on price drop" subscribe button.
 *
 * Props:
 *   - productId, productTitle, currentPrice — required, drive the dialog
 *   - variant "inline" | "block"
 */
export default function PriceDropAlertButton({
  productId,
  productTitle,
  currentPrice,
  variant = "inline",
}) {
  const toast = useToast();
  const [subscribed, setSubscribed] = useState(false);
  const [activeTarget, setActiveTarget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (!productId || !isAuthenticated()) {
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      const alerts = await loadAlertsOnce();
      if (cancelled) return;
      const own = alerts.find((a) => String(a.productId) === String(productId));
      setSubscribed(Boolean(own));
      setActiveTarget(own?.targetPrice ?? null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [productId]);

  const openDialog = () => {
    if (!isAuthenticated()) {
      toast.info("Sign in to get price-drop notifications.");
      return;
    }
    setDialogOpen(true);
  };

  const handleUnsubscribe = async (e) => {
    e.stopPropagation();
    if (busy || loading) return;
    setBusy(true);
    try {
      await unsubscribePriceAlert(productId);
      invalidateAlertsCache();
      setSubscribed(false);
      setActiveTarget(null);
      toast.info("Price alert removed.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't remove the alert.");
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = async (target) => {
    setBusy(true);
    try {
      const { alert } = await subscribePriceAlert({
        productId,
        targetPrice: target,
      });
      invalidateAlertsCache();
      setSubscribed(true);
      setActiveTarget(alert?.targetPrice ?? target);
      setDialogOpen(false);
      toast.success(
        `We'll alert you when this drops to $${(
          (alert?.targetPrice ?? target) / 2.8
        ).toFixed(2)}.`
      );
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't set the alert.");
    } finally {
      setBusy(false);
    }
  };

  if (subscribed) {
    return (
      <>
        <button
          type="button"
          className={`pda-btn pda-btn--${variant} pda-btn--on`}
          onClick={openDialog}
          disabled={busy || loading}
          aria-label={`Price alert active${
            activeTarget != null ? ` at $${(activeTarget / 2.8).toFixed(2)}` : ""
          }, click to update`}
        >
          <Check size={variant === "block" ? 16 : 14} aria-hidden="true" />
          <span>
            {activeTarget != null
              ? `Alert set at $${(activeTarget / 2.8).toFixed(2)}`
              : "Price alert on"}
          </span>
          <span
            className="pda-btn-remove"
            role="button"
            tabIndex={0}
            onClick={handleUnsubscribe}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleUnsubscribe(e);
              }
            }}
            aria-label="Remove price alert"
          >
            <X size={12} aria-hidden="true" />
          </span>
        </button>
        <PriceTargetDialog
          open={dialogOpen}
          productTitle={productTitle}
          currentPrice={currentPrice}
          onClose={() => setDialogOpen(false)}
          onSubmit={handleSubmit}
          busy={busy}
        />
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        className={`pda-btn pda-btn--${variant}`}
        onClick={openDialog}
        disabled={loading || !productId}
      >
        <TrendingDown size={variant === "block" ? 16 : 14} aria-hidden="true" />
        <span>{loading ? "…" : "Notify on price drop"}</span>
      </button>
      <PriceTargetDialog
        open={dialogOpen}
        productTitle={productTitle}
        currentPrice={currentPrice}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleSubmit}
        busy={busy}
      />
    </>
  );
}
