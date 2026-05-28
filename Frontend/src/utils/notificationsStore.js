import { getNotifications } from "../api/client";

/** @type {{ notifications: object[], unread: number, fetchedAt: number } | null} */
let cache = null;
/** @type {Promise<{ notifications: object[], unread: number }> | null} */
let inflight = null;

/**
 * Shared inbox fetch used by the nav bell and profile notifications page.
 * Concurrent callers share one in-flight request; cached data is reused until
 * {@link invalidateNotificationsCache} runs (logout or inbox mutation).
 */
export async function loadNotifications({ force = false } = {}) {
  if (!force && cache) {
    return { notifications: cache.notifications, unread: cache.unread };
  }
  if (inflight) return inflight;

  inflight = getNotifications()
    .then((data) => {
      const payload = {
        notifications: Array.isArray(data?.notifications) ? data.notifications : [],
        unread: Number(data?.unread) || 0,
      };
      cache = { ...payload, fetchedAt: Date.now() };
      return payload;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

export function getNotificationsCache() {
  if (!cache) return null;
  return { notifications: cache.notifications, unread: cache.unread };
}

export function invalidateNotificationsCache() {
  cache = null;
  inflight = null;
}
