import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { CartProvider } from "./context/CartProvider";
import { UserProfileProvider } from "./context/UserProfileProvider";
import { SavedProvider } from "./context/SavedProvider";
import { AssistantProvider } from "./context/AssistantProvider";
import { ToastProvider } from "./context/ToastProvider";
import { onAuthChange } from "./utils/authToken";
import { clearRecentlyViewed } from "./utils/recentlyViewed";
import { invalidateNotificationsCache } from "./utils/notificationsStore";
import ErrorBoundary from "./components/ErrorBoundary";
import "./styles/theme.css";
import "./styles/theme-surfaces.css";
import "./components/Skeleton.css";
import "./index.css";
import { ThemeProvider } from "./context/ThemeProvider";
import App from "./App.jsx";

/**
 * Wipe per-user client state when the user logs out. The cart already does
 * this via its own subscriber inside CartProvider; this listener handles
 * everything else that lives in localStorage outside of a context.
 */
onAuthChange(({ authenticated }) => {
  if (!authenticated) {
    clearRecentlyViewed();
    invalidateNotificationsCache();
  }
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <ToastProvider>
          <ThemeProvider>
            <CartProvider>
              <UserProfileProvider>
                <SavedProvider>
                  <AssistantProvider>
                    <App />
                  </AssistantProvider>
                </SavedProvider>
              </UserProfileProvider>
            </CartProvider>
          </ThemeProvider>
        </ToastProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>
);
