/** Cross-page sync when inbox or product alert subscriptions change. */

export const NOTIFICATIONS_CHANGED = "smartcart:notifications-changed";
export const ALERTS_CHANGED = "smartcart:alerts-changed";

export function emitNotificationsChanged() {
  window.dispatchEvent(new CustomEvent(NOTIFICATIONS_CHANGED));
}

/**
 * @param {{ productId?: string }} [detail]
 */
export function emitAlertsChanged(detail) {
  window.dispatchEvent(new CustomEvent(ALERTS_CHANGED, { detail: detail || {} }));
}

export function onNotificationsChanged(handler) {
  window.addEventListener(NOTIFICATIONS_CHANGED, handler);
  return () => window.removeEventListener(NOTIFICATIONS_CHANGED, handler);
}

export function onAlertsChanged(handler) {
  const wrapped = (e) => handler(e.detail || {});
  window.addEventListener(ALERTS_CHANGED, wrapped);
  return () => window.removeEventListener(ALERTS_CHANGED, wrapped);
}
