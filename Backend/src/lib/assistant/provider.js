const ruleBased = require("./ruleBased");
const openaiAdapter = require("./openai");
const geminiAdapter = require("./gemini");

/**
 * Pluggable assistant provider.
 *
 * The rule-based engine is always the source of structured output (products,
 * actions, suggestions). When an LLM provider is selected and configured, it
 * rewrites only the free-text `reply` field for friendlier tone — if the LLM
 * call fails for any reason we silently fall back to the rule-based draft so
 * the user never sees a broken assistant.
 *
 *   ASSISTANT_PROVIDER=rule-based  (default; no key needed)
 *   ASSISTANT_PROVIDER=gemini      + GEMINI_API_KEY=...   (free tier friendly)
 *   ASSISTANT_PROVIDER=openai      + OPENAI_API_KEY=...
 */

const SELECTED = (process.env.ASSISTANT_PROVIDER || "rule-based").toLowerCase();

const ADAPTERS = {
  openai: openaiAdapter,
  gemini: geminiAdapter,
};

function pickAdapter() {
  const adapter = ADAPTERS[SELECTED];
  if (!adapter) return null;
  if (!adapter.isAvailable()) {
    console.warn(
      `[assistant] ASSISTANT_PROVIDER=${SELECTED} but the matching API key is not set; ` +
        `using rule-based engine instead.`
    );
    return null;
  }
  return adapter;
}

const ACTIVE_ADAPTER = pickAdapter();
const PROVIDER = ACTIVE_ADAPTER?.name || "rule-based";

function topProductsForContext(db, max = 12) {
  return (db.products || []).slice(0, max).map((p) => ({
    id: p.id,
    title: p.title,
    category: p.category,
    brand: p.brand,
    priceUsd: Math.round((Number(p.price) || 0) / 2.8),
    rating: p.rating,
  }));
}

/**
 * Look up the full product record for the page the user is on so the LLM
 * gets real specs, brand, rating, etc. — not just the title we received
 * from the client. Falls back to the client-supplied context if the
 * product can't be found (e.g. user came from a deleted product).
 */
function buildPageContext(db, context) {
  if (!context?.productId) return null;
  const product = (db.products || []).find(
    (p) => String(p.id) === String(context.productId)
  );
  if (!product) {
    return {
      productId: context.productId,
      title: context.productTitle || context.productId,
      category: context.productCategory || "",
      priceUsd: context.productPrice
        ? Math.round(Number(context.productPrice) / 2.8)
        : null,
    };
  }
  return {
    productId: product.id,
    title: product.title,
    category: product.category,
    brand: product.brand,
    priceUsd: Math.round((Number(product.price) || 0) / 2.8),
    rating: product.rating,
    stock: product.stock,
    specs: product.specs && typeof product.specs === "object" ? product.specs : null,
  };
}

async function generate({ db, message, history, userId, context }) {
  const pageContext = buildPageContext(db, context);
  const base = ruleBased.buildReply(db, { message, userId, pageContext });
  if (!ACTIVE_ADAPTER) return base;

  try {
    const rewritten = await ACTIVE_ADAPTER.rewriteReply({
      message,
      history,
      draft: base.reply,
      catalogContext: topProductsForContext(db),
      pageContext,
    });
    if (rewritten && rewritten.trim()) {
      return { ...base, reply: rewritten.trim() };
    }
    return base;
  } catch (err) {
    console.warn(
      `[assistant] ${ACTIVE_ADAPTER.name} fallback to rule-based:`,
      err.message
    );
    return base;
  }
}

module.exports = { generate, PROVIDER };
