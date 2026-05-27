import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { AssistantContext } from "./assistant-context";
import AssistantDrawer from "../components/AssistantDrawer/AssistantDrawer";
import AssistantLauncher from "../components/AssistantDrawer/AssistantLauncher";
import ErrorBoundary from "../components/ErrorBoundary";
import { getProductById } from "../api/client";
import { isAuthenticated, onAuthChange } from "../utils/authToken";

/**
 * Routes where the global floating launcher should be hidden — only the
 * pre-auth pages, since the chatbot endpoint requires a JWT. Every other
 * authenticated page (Home, Catalog, ProductDetail, Cart, Checkout, Profile,
 * Orders, Saved, Settings) renders the same icon-only launcher in the corner.
 */
function shouldShowGlobalLauncher(pathname) {
  if (!pathname || pathname === "/") return false;
  if (pathname.startsWith("/login")) return false;
  if (pathname.startsWith("/register")) return false;
  if (pathname.startsWith("/forgot-password")) return false;
  if (pathname.startsWith("/reset-password")) return false;
  if (pathname.startsWith("/auth/")) return false;
  // Admin console has its own UI; don't surface the shopper-facing assistant.
  if (pathname.startsWith("/admin")) return false;
  return true;
}

const PRODUCT_DETAIL_RE = /^\/product\/[^/]+\/([^/]+)$/;

function productIdFromPath(pathname) {
  const m = PRODUCT_DETAIL_RE.exec(pathname || "");
  return m ? decodeURIComponent(m[1]) : null;
}

export function AssistantProvider({ children }) {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [context, setContext] = useState(null);

  /**
   * Background cache of product context for the page the user is currently
   * looking at. We fetch in the background as soon as they land on a
   * `/product/:segment/:id` route and reuse it as the drawer's initial
   * context — even when the launcher is opened via a click rather than via
   * `open(ctx)`. Cleared when the user navigates away.
   */
  const pageContextRef = useRef(null);

  /**
   * Position of the draggable launcher, kept in React state at the provider
   * level so it survives page-to-page navigation but resets to "default
   * corner" on a hard refresh (state is gone with the page) and on logout
   * (cleared explicitly via the auth-change event below). `null` means the
   * launcher uses its CSS default position.
   */
  const [launcherPosition, setLauncherPosition] = useState(null);

  const open = useCallback((nextContext = null) => {
    setContext(nextContext ?? pageContextRef.current ?? null);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => setIsOpen(false), []);

  /** Shift global toasts to the bottom-left while the drawer covers the right. */
  useEffect(() => {
    if (isOpen) {
      document.documentElement.dataset.assistantOpen = "true";
    } else {
      delete document.documentElement.dataset.assistantOpen;
    }
    return () => {
      delete document.documentElement.dataset.assistantOpen;
    };
  }, [isOpen]);

  /** Reset the launcher position whenever the user logs out (or in, for
   *  symmetry — a fresh session starts at the default corner). */
  useEffect(() => {
    return onAuthChange(() => {
      setLauncherPosition(null);
      setIsOpen(false);
      pageContextRef.current = null;
    });
  }, []);

  /**
   * Whenever the URL points at a product detail page, fetch the product so
   * we can pre-fill the drawer's context. We skip the network call entirely
   * for non-product routes and for unauthenticated visitors (the API
   * requires a JWT).
   */
  useEffect(() => {
    const productId = productIdFromPath(location.pathname);
    if (!productId || !isAuthenticated()) {
      pageContextRef.current = null;
      return undefined;
    }

    let cancelled = false;
    (async () => {
      try {
        const data = await getProductById(productId);
        if (cancelled || !data?.product) return;
        pageContextRef.current = {
          productId: data.product.id,
          productTitle: data.product.title,
          productCategory: data.product.category || "",
          productPrice: data.product.price,
          productImage: data.product.image || "",
        };
      } catch {
        // Failure is silent; opening the drawer just won't have context.
        if (!cancelled) pageContextRef.current = null;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  const value = useMemo(
    () => ({ isOpen, context, open, close }),
    [isOpen, context, open, close]
  );

  const showLauncher =
    !isOpen && isAuthenticated() && shouldShowGlobalLauncher(location.pathname);

  return (
    <AssistantContext.Provider value={value}>
      {children}
      {/*
       * Wrap the chatbot UI in a silent boundary — if the launcher or
       * drawer crashes (e.g. the rate-limited chat API returns a malformed
       * payload that breaks rendering) we'd rather silently lose the
       * widget than blank the entire app.
       */}
      <ErrorBoundary variant="silent" resetKey={location.pathname}>
        {showLauncher ? (
          <AssistantLauncher
            onOpen={() => open()}
            position={launcherPosition}
            onPositionChange={setLauncherPosition}
            expanded={isOpen}
          />
        ) : null}
        <AssistantDrawer open={isOpen} onClose={close} initialContext={context} />
      </ErrorBoundary>
    </AssistantContext.Provider>
  );
}
