/**
 * Google Gemini adapter for the SmartCart shopping assistant.
 *
 * Uses the `generateContent` REST endpoint of the Generative Language API.
 * The default model is `gemini-2.5-flash`, which is on Google's free tier
 * (1,500 requests/day, 10 RPM as of May 2026).
 *
 * Like the OpenAI adapter, this only rewrites the rule-based draft so the
 * structured payload (products, actions, suggestions) stays consistent
 * regardless of which provider is active.
 *
 * Note on roles: Gemini's API uses "user" and "model" (not "assistant"), and
 * it doesn't accept multiple consecutive turns from the same role, so we
 * coalesce history before sending.
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || null;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

function endpointFor(model) {
  return (
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:` +
    `generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`
  );
}

function isAvailable() {
  return Boolean(GEMINI_API_KEY);
}

const SYSTEM_PROMPT =
  "You are SmartCart's friendly shopping assistant. Keep replies under 80 words. " +
  "If the user asks for a product recommendation, mention 1-3 specific items by name " +
  "from the catalog you were given. If they ask about an order, say you'll route them " +
  "to their order history. Never invent SKUs or prices.";

/**
 * Convert our internal `[ {role:"user|assistant", content} ]` history into
 * Gemini's contents shape, mapping `assistant` → `model` and merging adjacent
 * same-role turns into one (the API rejects consecutive same-role messages).
 */
function buildContents(history, message, draftFollowUp) {
  const turns = [
    ...history.slice(-6).map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      text: String(m.content || ""),
    })),
    { role: "user", text: message },
    { role: "user", text: draftFollowUp },
  ];

  const merged = [];
  for (const turn of turns) {
    const last = merged[merged.length - 1];
    if (last && last.role === turn.role) {
      last.text += `\n${turn.text}`;
    } else {
      merged.push({ ...turn });
    }
  }
  return merged.map((m) => ({
    role: m.role,
    parts: [{ text: m.text }],
  }));
}

async function rewriteReply({ message, history, draft, catalogContext, pageContext }) {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const pageContextLine = pageContext
    ? `Current product the user is looking at (JSON): ${JSON.stringify(pageContext)}\n` +
      `Treat references like "it"/"this" as that product. Cite real specs from this object only.\n`
    : "";

  const draftFollowUp =
    pageContextLine +
    `Catalog excerpt (JSON): ${JSON.stringify(catalogContext)}\n` +
    `My initial draft reply was: "${draft}". Refine it (same meaning, friendlier).`;

  const body = {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: buildContents(history, message, draftFollowUp),
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 240,
    },
  };

  const res = await fetch(endpointFor(GEMINI_MODEL), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Gemini ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  const reply = (data?.candidates || [])
    .flatMap((c) => c?.content?.parts || [])
    .map((p) => p?.text || "")
    .join("")
    .trim();
  return reply;
}

module.exports = {
  name: "gemini",
  isAvailable,
  rewriteReply,
};
