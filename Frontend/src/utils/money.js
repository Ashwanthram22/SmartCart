/**
 * Shared currency helpers.
 *
 * SmartCart prices are stored in **Indian Rupees (INR)** end-to-end. This
 * module is the single source of truth for how those numbers are presented
 * — every page (catalog, cart, checkout, admin, profile, exports) should
 * import from here instead of building its own `Intl.NumberFormat`.
 *
 * Centralising it means:
 *   - The currency symbol / locale can be changed in one place.
 *   - Edge cases (NaN, null, negative, very large) get the same fallback.
 *   - We can add things like compact ("\u20b91.2L") variants later without
 *     hunting through every component.
 */

const INR_FORMATTER = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const INR_FORMATTER_NO_FRACTION = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/**
 * Format a number as an INR price string (e.g. `\u20b91,23,456.00`).
 * Returns `\u20b90.00` for non-finite / null inputs so callers don't have to
 * sprinkle their own guards.
 */
export function formatMoney(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return INR_FORMATTER.format(0);
  return INR_FORMATTER.format(num);
}

/**
 * Same as {@link formatMoney} but without the trailing `.00` — useful for
 * compact UI like sliders, chips, or summary tiles where the decimals add
 * noise.
 */
export function formatMoneyShort(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return INR_FORMATTER_NO_FRACTION.format(0);
  return INR_FORMATTER_NO_FRACTION.format(num);
}

/** Plain currency symbol used by inputs / placeholders that need just the glyph. */
export const CURRENCY_SYMBOL = "\u20b9";
