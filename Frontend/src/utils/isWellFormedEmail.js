/** Shown under email fields; must match submit-time `errorBelow` when forcing format hint. */
export const EMAIL_FORMAT_HINT = "Enter proper email format";

/**
 * Reasonable client-side email shape check for forms (UX, not legal proof).
 * @param {string} value
 * @returns {boolean}
 */
export function isWellFormedEmail(value) {
  const v = String(value || "").trim();
  if (!v) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}
