/**
 * OpenAI adapter for the SmartCart shopping assistant.
 *
 * Exposes `rewriteReply({ message, history, draft, catalogContext })` which
 * asks the model to refine the rule-based draft reply into something more
 * natural while keeping the same meaning. Returns the new text, or throws so
 * `provider.js` can fall back to the rule-based draft.
 */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || null;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const ENDPOINT = "https://api.openai.com/v1/chat/completions";

function isAvailable() {
  return Boolean(OPENAI_API_KEY);
}

const SYSTEM_PROMPT =
  "You are SmartCart's friendly shopping assistant. Keep replies under 80 words. " +
  "If the user asks for a product recommendation, mention 1-3 specific items by name " +
  "from the catalog you were given. If they ask about an order, say you'll route them " +
  "to their order history. Never invent SKUs or prices.";

async function rewriteReply({ message, history, draft, catalogContext, pageContext }) {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  const pageContextLine = pageContext
    ? `Current product the user is looking at (JSON): ${JSON.stringify(pageContext)}\n` +
      `Treat references like "it"/"this" as that product. Cite real specs from this object only.\n`
    : "";

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.slice(-6).map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: String(m.content || ""),
    })),
    { role: "user", content: message },
    {
      role: "system",
      content:
        pageContextLine +
        `Catalog excerpt (JSON): ${JSON.stringify(catalogContext)}\n` +
        `My initial draft reply was: "${draft}". Refine it (same meaning, friendlier).`,
    },
  ];

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages,
      temperature: 0.4,
      max_tokens: 240,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenAI ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  return String(data?.choices?.[0]?.message?.content || "").trim();
}

module.exports = {
  name: "openai",
  isAvailable,
  rewriteReply,
};
