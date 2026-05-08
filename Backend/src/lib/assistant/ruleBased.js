/**
 * Built-in conversational shopping assistant. No external API required.
 *
 * The matcher classifies the user's message into a coarse intent and returns a
 * structured payload the frontend can render directly:
 *
 *   {
 *     reply:        string,          // free-text response
 *     products?:    Product[],       // shown as small cards
 *     suggestions?: string[],        // chips the user can tap to send back
 *     actions?:     [{ type, ... }], // buttons, e.g. addToCart
 *   }
 *
 * Keeping it deterministic + JSON-shaped means the same FE drawer can later
 * be wired to an LLM provider that emits the same envelope (see provider.js).
 */

const INR_TO_USD = 2.8;

function toUsd(n) {
  return Math.round((Number(n) || 0) / INR_TO_USD);
}

function summariseProduct(p) {
  return {
    id: p.id,
    title: p.title,
    image: p.image,
    price: toUsd(p.price),
    rating: p.rating,
    category: p.category,
    brand: p.brand || null,
  };
}

function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

const STOPWORDS = new Set([
  "a", "an", "the", "is", "for", "to", "of", "and", "or", "with", "on", "in",
  "i", "me", "my", "we", "you", "your", "show", "find", "get", "looking",
  "want", "need", "please", "give", "any", "some", "do", "have", "can", "would",
  "could", "should", "are", "this", "that", "those", "these", "tell", "about",
  "from", "under", "over", "less", "more", "than", "best", "good", "great",
  "recommend", "recommendation", "suggestions", "products", "product", "items",
  "item", "thing", "things", "stuff",
]);

function meaningfulTokens(text) {
  return tokenize(text).filter((t) => !STOPWORDS.has(t) && t.length > 1);
}

function priceCeilingFromText(text) {
  const m = String(text).match(/(?:under|below|less than|<=?|cheaper than)\s*\$?\s*(\d{2,5})/i);
  if (m) return Number(m[1]);
  const m2 = String(text).match(/\$\s*(\d{2,5})/);
  if (m2) return Number(m2[1]);
  return null;
}

function ratingFloorFromText(text) {
  const m = String(text).match(/(?:above|over|>=?)\s*(\d(?:\.\d)?)\s*(?:stars?)?/i);
  if (m) return Number(m[1]);
  const m2 = String(text).match(/(\d(?:\.\d)?)\s*\+\s*(?:stars?|rating)/i);
  if (m2) return Number(m2[1]);
  return null;
}

function searchProducts(db, message, { limit = 4 } = {}) {
  const tokens = meaningfulTokens(message);
  const priceMax = priceCeilingFromText(message);
  const ratingMin = ratingFloorFromText(message);

  const scored = db.products
    .map((p) => {
      const hay = `${p.title || ""} ${p.category || ""} ${p.brand || ""} ${(
        p.catalogSegments || []
      ).join(" ")}`.toLowerCase();
      let score = 0;
      for (const t of tokens) {
        if (!hay.includes(t)) continue;
        score += t.length >= 4 ? 2 : 1;
      }
      if (priceMax != null && toUsd(p.price) > priceMax) score -= 100;
      if (ratingMin != null && (Number(p.rating) || 0) < ratingMin) score -= 100;
      // mild popularity boost so generic queries still surface good picks
      score += (Number(p.rating) || 0) * 0.4;
      return { product: p, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.product);

  return scored;
}

function findProductByName(db, message) {
  const tokens = meaningfulTokens(message);
  if (tokens.length === 0) return null;
  let best = null;
  let bestScore = 0;
  for (const p of db.products) {
    const title = String(p.title || "").toLowerCase();
    let score = 0;
    for (const t of tokens) {
      if (title.includes(t)) score += t.length;
    }
    if (score > bestScore) {
      bestScore = score;
      best = p;
    }
  }
  return bestScore >= 4 ? best : null;
}

const STORE_INFO = {
  shipping:
    "Standard shipping is free on every order and arrives in 3–5 business days. " +
    "Express options appear at checkout for eligible items.",
  returns:
    "You have 30 days from delivery to return any item — no questions asked. " +
    "AI-Optimised Bundles get an extended 60-day window.",
  warranty:
    "Most electronics ship with a 2-year SmartCart warranty. Eligible items " +
    "show a warranty badge on the product page.",
  contact:
    "Reach support 24/7 via the chat icon, or email help@smartcart.example. " +
    "We typically reply within an hour.",
};

function intentOf(message) {
  const t = String(message || "").toLowerCase();

  if (/\b(hi|hello|hey|yo|hola)\b/.test(t)) return "greeting";
  if (/\b(thanks|thank you|cheers|appreciate)\b/.test(t)) return "thanks";

  if (/\b(add|put)\b.*\b(cart|basket|bag)\b/.test(t)) return "add-to-cart";
  if (/\b(buy|purchase)\b/.test(t) && !/\b(again|order)\b/.test(t)) return "add-to-cart";

  if (/\b(order|tracking|track|where('s| is) my)\b/.test(t)) return "order-status";

  if (/\b(ship|shipping|delivery)\b/.test(t)) return "info-shipping";
  if (/\b(return|refund|policy)\b/.test(t)) return "info-returns";
  if (/\b(warranty|guarantee)\b/.test(t)) return "info-warranty";
  if (/\b(help|support|contact)\b/.test(t)) return "info-contact";

  if (
    /\b(find|show|recommend|suggest|looking|search|need|want|browse)\b/.test(t) ||
    /\bunder\b\s*\$?\d/.test(t) ||
    /\bbest\b/.test(t) ||
    meaningfulTokens(t).length > 0
  ) {
    return "search";
  }

  return "fallback";
}

function suggestionChips(intent) {
  switch (intent) {
    case "search":
      return ["Show me trending picks", "Anything under $200?", "Best rated audio"];
    case "add-to-cart":
      return ["What's in my cart?", "Continue to checkout", "Find more like this"];
    case "order-status":
      return ["Show my orders", "Track my latest order", "Return policy"];
    case "info-shipping":
    case "info-returns":
    case "info-warranty":
    case "info-contact":
      return ["Recommend a gift under $100", "Show me trending picks", "Help me find a laptop"];
    default:
      return ["Recommend trending picks", "Find me wireless headphones", "Show orders"];
  }
}

function buildSearchReply(db, message) {
  const products = searchProducts(db, message);
  const summarised = products.map(summariseProduct);

  if (summarised.length === 0) {
    return {
      reply:
        "I couldn't find anything matching that. Try a category like 'audio', 'laptops', or " +
        "'wearables', or set a budget like 'under $300'.",
      suggestions: suggestionChips("search"),
    };
  }

  const lead = summarised[0];
  return {
    reply:
      summarised.length === 1
        ? `Here's a strong match — the ${lead.title} for $${lead.price}.`
        : `I found ${summarised.length} picks that look like a fit. Tap a card to open it.`,
    products: summarised,
    actions: summarised.slice(0, 1).map((p) => ({
      type: "addToCart",
      productId: p.id,
      label: `Add ${p.title} to cart`,
    })),
    suggestions: ["Show cheaper options", "Show top-rated only", "What's trending?"],
  };
}

function buildAddToCartReply(db, message) {
  const product = findProductByName(db, message);
  if (!product) {
    return {
      reply:
        "Sure — which product? Tell me the name (e.g. 'add the OmniWatch Pro 4') or describe " +
        "what you're after and I'll surface options.",
      suggestions: ["Show me trending picks", "Recommend a gift under $100"],
    };
  }
  const summary = summariseProduct(product);
  return {
    reply: `Tap the button to add the ${summary.title} ($${summary.price}) to your cart.`,
    products: [summary],
    actions: [
      {
        type: "addToCart",
        productId: summary.id,
        label: `Add ${summary.title} to cart`,
      },
    ],
    suggestions: ["What else goes with this?", "Show similar products", "Continue to checkout"],
  };
}

function buildOrderStatusReply(db, userId) {
  const orders = (db.orders || [])
    .filter((o) => o.userId === userId)
    .sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0))
    .slice(0, 3);

  if (orders.length === 0) {
    return {
      reply: "You don't have any orders yet. Want me to suggest something to start with?",
      suggestions: ["Recommend trending picks", "Show top-rated audio"],
    };
  }

  const lines = orders.map((o) => {
    const headline = o.items?.[0]?.title || "Order";
    const when = new Date(o.createdAt).toLocaleDateString();
    return `• #${o.id} — ${headline} • ${o.status} • $${(o.total || 0).toFixed(2)} • ${when}`;
  });
  return {
    reply: `Your most recent ${orders.length === 1 ? "order" : "orders"}:\n${lines.join("\n")}`,
    suggestions: ["Open order history", "Buy again", "Return policy"],
    actions: [{ type: "navigate", to: "/profile/orders", label: "Open order history" }],
  };
}

function buildReply(db, payload) {
  const message = String(payload.message || "").trim();
  const userId = payload.userId;
  const intent = intentOf(message);

  switch (intent) {
    case "greeting":
      return {
        reply:
          "Hi! I'm your SmartCart shopping assistant. I can recommend products, " +
          "answer questions about your orders, and even add things to your cart.",
        suggestions: suggestionChips("search"),
      };

    case "thanks":
      return {
        reply: "Anytime — happy shopping!",
        suggestions: suggestionChips("search"),
      };

    case "add-to-cart":
      return buildAddToCartReply(db, message);

    case "order-status":
      return buildOrderStatusReply(db, userId);

    case "info-shipping":
      return { reply: STORE_INFO.shipping, suggestions: suggestionChips("info-shipping") };
    case "info-returns":
      return { reply: STORE_INFO.returns, suggestions: suggestionChips("info-returns") };
    case "info-warranty":
      return { reply: STORE_INFO.warranty, suggestions: suggestionChips("info-warranty") };
    case "info-contact":
      return { reply: STORE_INFO.contact, suggestions: suggestionChips("info-contact") };

    case "search":
      return buildSearchReply(db, message);

    default:
      return {
        reply:
          "I can help you find products, check on an order, or answer policy questions. " +
          "Try 'recommend a wireless headset under $200' or 'where is my order?'.",
        suggestions: suggestionChips("fallback"),
      };
  }
}

module.exports = { buildReply };
