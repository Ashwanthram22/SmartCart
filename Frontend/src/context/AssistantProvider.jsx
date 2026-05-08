import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { AssistantContext } from "./assistant-context";
import AssistantDrawer from "../components/AssistantDrawer/AssistantDrawer";
import AssistantLauncher from "../components/AssistantDrawer/AssistantLauncher";
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
  if (pathname.startsWith("/auth/")) return false;
  return true;
}

export function AssistantProvider({ children }) {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [context, setContext] = useState(null);

  /**
   * Position of the draggable launcher, kept in React state at the provider
   * level so it survives page-to-page navigation but resets to "default
   * corner" on a hard refresh (state is gone with the page) and on logout
   * (cleared explicitly via the auth-change event below). `null` means the
   * launcher uses its CSS default position.
   */
  const [launcherPosition, setLauncherPosition] = useState(null);

  const open = useCallback((nextContext = null) => {
    setContext(nextContext);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => setIsOpen(false), []);

  /** Reset the launcher position whenever the user logs out (or in, for
   *  symmetry — a fresh session starts at the default corner). */
  useEffect(() => {
    return onAuthChange(() => {
      setLauncherPosition(null);
      setIsOpen(false);
    });
  }, []);

  const value = useMemo(
    () => ({ isOpen, context, open, close }),
    [isOpen, context, open, close]
  );

  const showLauncher =
    !isOpen && isAuthenticated() && shouldShowGlobalLauncher(location.pathname);

  return (
    <AssistantContext.Provider value={value}>
      {children}
      {showLauncher ? (
        <AssistantLauncher
          onOpen={() => open()}
          position={launcherPosition}
          onPositionChange={setLauncherPosition}
        />
      ) : null}
      <AssistantDrawer open={isOpen} onClose={close} initialContext={context} />
    </AssistantContext.Provider>
  );
}
