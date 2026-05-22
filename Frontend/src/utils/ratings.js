/** Star string from product or review rating (1–5). */
export function starsFromRating(rating) {
  const r = Number(rating);
  if (!Number.isFinite(r) || r <= 0) return "";
  const filled = Math.round(Math.max(1, Math.min(5, r)));
  return "★".repeat(filled) + "☆".repeat(5 - filled);
}

/** Human-readable review count, or null when none / unknown. */
export function reviewCountLabel(count) {
  const n = Number(count);
  if (!Number.isFinite(n) || n < 0) return null;
  if (n === 0) return "No reviews yet";
  return `(${n.toLocaleString()} review${n === 1 ? "" : "s"})`;
}
