import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { chatWithAssistant } from "../../api/client";
import { productDetailUrl } from "../../constants/shopRoutes";
import { useCart } from "../../hooks/useCart";
import { useToast } from "../../hooks/useToast";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import { formatMoney } from "../../utils/money";
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

const GENERIC_GREETING = {
  id: "greeting",
  role: "assistant",
  content:
    "Hi! I'm your SmartCart assistant. Ask me to recommend products, check on an order, or " +
    "answer policy questions like 'what's your return window?'",
  suggestions: [
    "Recommend trending picks",
    "Show me audio under \u20b9 16,000",
    "Where is my order?",
  ],
};

function productGreeting(ctx) {
  if (!ctx?.productTitle) return GENERIC_GREETING;
  return {
    id: "greeting-product",
    role: "assistant",
    content: `Hi! Ask me anything about the ${ctx.productTitle}\u2014comparisons, specs, fit for what you do, or whether to buy.`,
    suggestions: [
      `Is the ${ctx.productTitle} worth it?`,
      "How does it compare to similar products?",
      "Show me cheaper alternatives",
    ],
  };
}

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
          <span className="assist-product-price">{formatMoney(product.price)}</span>
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
  const toastApi = useToast();

  const [turns, setTurns] = useState(() => [productGreeting(initialContext)]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [errorRequestId, setErrorRequestId] = useState("");
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const drawerRef = useRef(null);
  useFocusTrap(drawerRef, open);

  useEffect(() => {
    if (open) return;
    setError("");
    setErrorRequestId("");
  }, [open]);

  /**
   * Reset the chat when the drawer transitions from closed → open so a new
   * session always starts with the *current* page context (and so a context
   * from a previous product page doesn't leak into the next conversation).
   * The contextKey-driven `useState` initialiser would only run on mount.
   */
  const contextKey = initialContext?.productId || "_global";
  const lastContextKeyRef = useRef(contextKey);
  useEffect(() => {
    if (!open) return;
    if (lastContextKeyRef.current !== contextKey) {
      setTurns([productGreeting(initialContext)]);
      lastContextKeyRef.current = contextKey;
    }
  }, [open, contextKey, initialContext]);

  /** Quick-context line shown at the top when the drawer was opened from a
   *  product page; the model also receives it explicitly via the request
   *  payload so the LLM can ground its answers in this product. */
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
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [turns, sending, open]);

  const handleAddToCart = useCallback(
    (action) => {
      const productInfo = turns
        .flatMap((t) => t.products || [])
        .find((p) => String(p.id) === String(action.productId));
      if (!productInfo) {
        toastApi.error("Couldn't add — product not in this conversation.");
        return;
      }
      addItem(productInfo);
      toastApi.success(`Added ${productInfo.title} to cart`);
    },
    [turns, addItem, toastApi]
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
      navigate(productDetailUrl("AI Picks", productId, ""));
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
      setErrorRequestId("");

      try {
        const reply = await chatWithAssistant({
          message: text,
          history: historyForApi,
          context: initialContext || undefined,
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
        const status = err.response?.status;
        const message =
          status === 429
            ? "Slow down — too many messages in a row. Try again in a moment."
            : status === 504
              ? err.response?.data?.message ||
                "That took too long. Try a shorter question or try again in a moment."
              : err.response?.data?.message ||
                "Assistant didn't respond. Try again?";
        setTurns((prev) => prev.filter((t) => t.id !== userTurn.id));
        setDraft(text);
        setError(message);
        setErrorRequestId(
          err.response?.data?.requestId ? String(err.response.data.requestId) : ""
        );
        // Also surface a toast so the failure is noticed even if the user
        // has scrolled away from the input row inside the drawer.
        toastApi.error(message);
      } finally {
        setSending(false);
        window.setTimeout(() => inputRef.current?.focus(), 30);
      }
    },
    [draft, sending, turns, initialContext, toastApi]
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
        ref={drawerRef}
        className={`assist-drawer${open ? " assist-drawer--open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="assist-drawer-title"
        aria-hidden={!open}
        inert={!open || undefined}
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

        <div
          className="assist-body"
          ref={listRef}
          role="log"
          aria-live="polite"
          aria-atomic="false"
          aria-relevant="additions"
        >
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

        {error ? (
          <div className="assist-error-wrap" role="alert">
            <p className="assist-error">{error}</p>
            {errorRequestId ? (
              <p className="assist-error-id">Reference: {errorRequestId}</p>
            ) : null}
            <div className="assist-error-actions">
              <button
                type="button"
                className="assist-error-btn assist-error-btn--primary"
                onClick={() => sendMessage(draft)}
                disabled={!draft.trim() || sending}
              >
                Retry
              </button>
              <button
                type="button"
                className="assist-error-btn"
                onClick={() => {
                  setError("");
                  setErrorRequestId("");
                }}
              >
                Dismiss
              </button>
            </div>
          </div>
        ) : null}

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

      </aside>
    </>
  );
}
