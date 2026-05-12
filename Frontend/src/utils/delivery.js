/**
 * Tiny lead-time model used by ProductDetail to surface a "Get it by ..."
 * estimate. We don't have a real warehouse so we map stock buckets onto a
 * shipping window and return both bounds so the UI can render a range
 * ("Tue, Apr 14 – Thu, Apr 16").
 *
 *   stock >= 25  → 2-3 days   (in-stock express)
 *   stock 6-24   → 3-5 days   (limited stock, picking is slower)
 *   stock 1-5    → 5-7 days   (last few, may need cross-warehouse transfer)
 *   stock <= 0   → null       (caller should hide the line entirely)
 */
export function estimateDelivery(stock, now = new Date()) {
  const n = Number(stock);
  if (!Number.isFinite(n) || n <= 0) return null;

  let minDays;
  let maxDays;
  if (n >= 25) {
    minDays = 2;
    maxDays = 3;
  } else if (n >= 6) {
    minDays = 3;
    maxDays = 5;
  } else {
    minDays = 5;
    maxDays = 7;
  }

  const start = addBusinessDays(now, minDays);
  const end = addBusinessDays(now, maxDays);
  return { start, end };
}

function addBusinessDays(date, days) {
  const out = new Date(date);
  let added = 0;
  while (added < days) {
    out.setDate(out.getDate() + 1);
    const dow = out.getDay();
    if (dow !== 0 && dow !== 6) added += 1;
  }
  return out;
}

const FMT = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  month: "short",
  day: "numeric",
});

export function formatDeliveryWindow(window) {
  if (!window) return "";
  const startTxt = FMT.format(window.start);
  const endTxt = FMT.format(window.end);
  if (startTxt === endTxt) return startTxt;
  return `${startTxt} – ${endTxt}`;
}
