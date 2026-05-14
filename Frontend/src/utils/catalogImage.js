const UNSPLASH_HOST = "images.unsplash.com";

/**
 * Build a resized Unsplash URL by setting the `w` query param (Unsplash CDN
 * generates derivatives on the fly). Returns null if the URL is not Unsplash
 * or cannot be parsed.
 */
function unsplashUrlAtWidth(url, width) {
  if (!url || typeof url !== "string" || !url.includes(UNSPLASH_HOST)) return null;
  try {
    const u = new URL(url);
    if (u.hostname !== UNSPLASH_HOST) return null;
    u.searchParams.set("w", String(width));
    if (!u.searchParams.has("auto")) u.searchParams.set("auto", "format");
    if (!u.searchParams.has("fit")) u.searchParams.set("fit", "crop");
    if (!u.searchParams.has("q")) u.searchParams.set("q", "75");
    return u.toString();
  } catch {
    return null;
  }
}

/**
 * Props for catalog grid `<img>`: responsive `srcSet` for Unsplash, sensible
 * `sizes` for a 3-column card grid, and loading hints for LCP / below-the-fold.
 *
 * @param {string | undefined} url
 * @param {{ index?: number }} [options] — `index` in the current page list (0-based)
 * @returns {Record<string, string | number | undefined>}
 */
export function getCatalogGridImageProps(url, options = {}) {
  const index = Number(options.index) || 0;
  const eager = index < 6;
  const base = url || "";

  const w320 = unsplashUrlAtWidth(base, 320);
  const w480 = unsplashUrlAtWidth(base, 480);
  const w640 = unsplashUrlAtWidth(base, 640);
  const w960 = unsplashUrlAtWidth(base, 960);

  if (w320 && w480 && w640 && w960) {
    return {
      src: w640,
      srcSet: `${w320} 320w, ${w480} 480w, ${w640} 640w, ${w960} 960w`,
      sizes:
        "(max-width: 640px) 92vw, (max-width: 1024px) 46vw, (max-width: 1400px) 32vw, 400px",
      width: 400,
      height: 300,
      decoding: "async",
      loading: eager ? "eager" : "lazy",
      fetchPriority: eager ? "high" : "low",
    };
  }

  return {
    src: base,
    width: 400,
    height: 300,
    decoding: "async",
    loading: eager ? "eager" : "lazy",
    fetchPriority: eager ? "high" : "low",
  };
}
