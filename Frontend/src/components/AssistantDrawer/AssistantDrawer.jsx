import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { chatWithAssistant } from "../../api/client";
import { useCart } from "../../hooks/useCart";
import "./AssistantDrawer.css";

/**
 * Each turn rendered in the drawer. The assistant's payload from the backend
 * is folded into the same shape so the renderer doesn't need to branch on
 * source.
 *
 * @typedef {{
 *   id: string,
 *   role: "user" | "assistant",
 *   content?: string,
 *   products?: Array<object>,
 *   actions?: Array<object>,
 *   suggestions?: Array<string>,
 * }} ChatTurn
 */

const GREETING = {
  id: "greeting",
  role: "assistant",
  content:
    "Hi! I'm your SmartCart assistant. Ask me to recommend products, check on an order, or " +
    "answer policy questions like 'what's your return window?'",
  suggestions: [
    "Recommend trending picks",
    "Show me audio under $200",
    "Where is my order?",
  ],
};

function ProductMiniCard({ product, onOpen }) {
  return (
    <button
      type="button"
      className="assist-product-card"
      onClick={() => onOpen(product.id)}
    >
      {product.image ? (
        <img className="assist-product-img" src={product.image} alt="" loading="lazy" />
      ) : (
        <div className="assist-product-img assist-product-img--placeholder" />
      )}
      <div className="assist-product-meta">
        <p className="assist-product-title">{product.title}</p>
        <p className="assist-product-row">
          <span className="assist-product-price">${product.price}</span>
          {product.rating ? (
            <span className="assist-product-rating">★ {product.rating}</span>
          ) : null}
        </p>
        <p className="assist-product-cat">{product.category}</p>
      </div>
    </button>
  );
}

function ActionButton({ action, onAddToCart, onNavigate }) {
  if (action.type === "addToCart") {
    return (
      <button
        type="button"
        className="assist-action-btn assist-action-btn--primary"
        onClick={() => onAddToCart(action)}
      >
        + {action.label || "Add to cart"}
      </button>
    );
  }
  if (action.type === "navigate") {
    return (
      <button
        type="button"
        className="assist-action-btn"
        onClick={() => onNavigate(action.to)}
      >
        {action.label || "Open"}
      </button>
    );
  }
  return null;
}

export default function AssistantDrawer({ open, onClose, initialContext }) {
  const navigate = useNavigate();
  const { addItem } = useCart();

  const [turns, setTurns] = useState(() => [GREETING]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const listRef = useRef(null);
  const inputRef = useRef(null);

  /** Quick-context line shown at the top when the drawer was opened from a
   *  product page; the model also receives it implicitly via history. */
  const contextLabel = initialContext?.productTitle
    ? `Context: ${initialContext.productTitle}`
    : null;

  useEffect(() => {
    if (!open) return undefined;

    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 60);

    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
      window.clearTimeout(focusTimer);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = window.setTimeout(() => setToast(""), 2200);
    return () => window.clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [turns, sending, open]);

  const handleAddToCart = useCallback(
    (action) => {
      const productInfo = turns
        .flatMap((t) => t.products || [])
        .find((p) => String(p.id) === String(action.productId));
      if (!productInfo) {
        setToast("Couldn't add — product not in this conversation.");
        return;
      }
      addItem({
        productId: productInfo.id,
        title: productInfo.title,
        image: productInfo.image,
        subtitle: `${productInfo.category || "Product"} • ${productInfo.rating ?? "—"}★`,
        unitPrice: Number(productInfo.price) || 0,
      });
      setToast(`Added ${productInfo.title} to cart`);
    },
    [turns, addItem]
  );

  const handleNavigate = useCallback(
    (to) => {
      if (typeof to !== "string") return;
      navigate(to);
      onClose();
    },
    [navigate, onClose]
  );

  const handleProductOpen = useCallback(
    (productId) => {
      navigate(`/catalog/products/${productId}`);
      onClose();
    },
    [navigate, onClose]
  );

  const sendMessage = useCallback(
    async (rawText) => {
      const text = String(rawText ?? draft).trim();
      if (!text || sending) return;

      const userTurn = { id: `u${Date.now()}`, role: "user", content: text };
      const historyForApi = turns
        .filter((t) => t.role === "user" || t.role === "assistant")
        .map((t) => ({ role: t.role, content: t.content || "" }))
        .filter((m) => m.content);

      setTurns((prev) => [...prev, userTurn]);
      setDraft("");
      setSending(true);
      setError("");

      try {
        const reply = await chatWithAssistant({
          message: text,
          history: historyForApi,
        });
        const assistantTurn = {
          id: `a${Date.now()}`,
          role: "assistant",
          content: reply?.reply || "",
          products: Array.isArray(reply?.products) ? reply.products : undefined,
          actions: Array.isArray(reply?.actions) ? reply.actions : undefined,
          suggestions: Array.isArray(reply?.suggestions) ? reply.suggestions : undefined,
        };
        setTurns((prev) => [...prev, assistantTurn]);
      } catch (err) {
        setError(err.response?.data?.message || "Assistant didn't respond. Try again?");
      } finally {
        setSending(false);
        window.setTimeout(() => inputRef.current?.focus(), 30);
      }
    },
    [draft, sending, turns]
  );

  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();
      sendMessage();
    },
    [sendMessage]
  );

  const lastSuggestions = useMemo(() => {
    for (let i = turns.length - 1; i >= 0; i -= 1) {
      const turn = turns[i];
      if (turn.role === "assistant" && turn.suggestions?.length) {
        return turn.suggestions;
      }
    }
    return [];
  }, [turns]);

  return (
    <>
      <div
        className={`assist-backdrop${open ? " assist-backdrop--visible" : ""}`}
        onClick={onClose}
        aria-hidden={!open}
      />
      <aside
        className={`assist-drawer${open ? " assist-drawer--open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="assist-drawer-title"
        aria-hidden={!open}
      >
        <header className="assist-header">
          <div className="assist-header-text">
            <p className="assist-header-eyebrow">SmartCart AI</p>
            <h2 id="assist-drawer-title">Shopping assistant</h2>
            {contextLabel ? <p className="assist-header-context">{contextLabel}</p> : null}
          </div>
          <button
            type="button"
            className="assist-close"
            onClick={onClose}
            aria-label="Close assistant"
          >
            ×
          </button>
        </header>

        <div className="assist-body" ref={listRef}>
          {turns.map((turn) => (
            <div
              key={turn.id}
              className={`assist-turn assist-turn--${turn.role}`}
            >
              <div className="assist-bubble">
                {turn.content ? (
                  <p className="assist-bubble-text">{turn.content}</p>
                ) : null}
                {turn.products?.length ? (
                  <div className="assist-product-grid">
                    {turn.products.map((p) => (
                      <ProductMiniCard
                        key={p.id}
                        product={p}
                        onOpen={handleProductOpen}
                      />
                    ))}
                  </div>
                ) : null}
                {turn.actions?.length ? (
                  <div className="assist-action-row">
                    {turn.actions.map((a, idx) => (
                      <ActionButton
                        key={`${a.type}-${idx}`}
                        action={a}
                        onAddToCart={handleAddToCart}
                        onNavigate={handleNavigate}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          ))}
          {sending ? (
            <div className="assist-turn assist-turn--assistant">
              <div className="assist-bubble assist-bubble--typing" aria-live="polite">
                <span className="assist-typing-dot" />
                <span className="assist-typing-dot" />
                <span className="assist-typing-dot" />
              </div>
            </div>
          ) : null}
        </div>

        {lastSuggestions.length > 0 && !sending ? (
          <div className="assist-suggestions">
            {lastSuggestions.map((s) => (
              <button
                key={s}
                type="button"
                className="assist-suggestion-chip"
                onClick={() => sendMessage(s)}
              >
                {s}
              </button>
            ))}
          </div>
        ) : null}

        {error ? <p className="assist-error">{error}</p> : null}

        <form className="assist-input-row" onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ask anything about products, orders, or policies…"
            aria-label="Message the assistant"
            maxLength={1000}
            disabled={sending}
          />
          <button
            type="submit"
            className="assist-send"
            disabled={!draft.trim() || sending}
            aria-label="Send"
          >
            ↑
          </button>
        </form>

        {toast ? <div className="assist-toast">{toast}</div> : null}
      </aside>
    </>
  );
}
