import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ToastContext } from "./toast-context";
import "./ToastProvider.css";

const DEFAULT_DURATION = 4000;

let toastId = 0;
function nextId() {
  toastId += 1;
  return `t${toastId}`;
}

/**
 * App-level toast/snack provider. Renders a stack of dismissable cards in
 * the bottom-right (top on small screens to clear thumb reach for the
 * chatbot launcher). Each toast auto-dismisses after `duration` ms unless
 * the user hovers over it (timer pauses) or dismisses manually.
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());
  const pausedRef = useRef(new Set());

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    pausedRef.current.delete(id);
  }, []);

  const scheduleDismiss = useCallback(
    (id, duration) => {
      const existing = timersRef.current.get(id);
      if (existing) clearTimeout(existing);
      const handle = setTimeout(() => dismiss(id), duration);
      timersRef.current.set(id, handle);
    },
    [dismiss]
  );

  const show = useCallback(
    ({ message, variant = "info", duration = DEFAULT_DURATION, action } = {}) => {
      if (!message) return null;
      const id = nextId();
      setToasts((list) => [
        ...list,
        { id, message: String(message), variant, duration, action },
      ]);
      if (duration > 0) scheduleDismiss(id, duration);
      return id;
    },
    [scheduleDismiss]
  );

  const helpers = useMemo(
    () => ({
      show,
      dismiss,
      success: (message, opts) => show({ ...opts, message, variant: "success" }),
      error: (message, opts) => show({ ...opts, message, variant: "error" }),
      info: (message, opts) => show({ ...opts, message, variant: "info" }),
    }),
    [show, dismiss]
  );

  const handleMouseEnter = useCallback((id) => {
    const timer = timersRef.current.get(id);
    if (timer) clearTimeout(timer);
    pausedRef.current.add(id);
  }, []);

  const handleMouseLeave = useCallback(
    (id) => {
      pausedRef.current.delete(id);
      const t = toasts.find((x) => x.id === id);
      if (t && t.duration > 0) scheduleDismiss(id, Math.max(1500, t.duration / 2));
    },
    [toasts, scheduleDismiss]
  );

  // Clear all pending timers when the provider unmounts (HMR safety).
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((handle) => clearTimeout(handle));
      timers.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={helpers}>
      {children}
      <div className="toast-stack" role="region" aria-live="polite" aria-label="Notifications">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast toast--${t.variant}`}
            onMouseEnter={() => handleMouseEnter(t.id)}
            onMouseLeave={() => handleMouseLeave(t.id)}
          >
            <span className="toast-icon" aria-hidden="true">
              {t.variant === "success" ? "✓" : t.variant === "error" ? "!" : "i"}
            </span>
            <p className="toast-message">{t.message}</p>
            {t.action ? (
              <button
                type="button"
                className="toast-action"
                onClick={() => {
                  try {
                    t.action.onClick?.();
                  } finally {
                    dismiss(t.id);
                  }
                }}
              >
                {t.action.label}
              </button>
            ) : null}
            <button
              type="button"
              className="toast-close"
              aria-label="Dismiss notification"
              onClick={() => dismiss(t.id)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
