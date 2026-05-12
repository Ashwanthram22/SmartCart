import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { CartProvider } from "./context/CartProvider";
import { SavedProvider } from "./context/SavedProvider";
import { AssistantProvider } from "./context/AssistantProvider";
import { ToastProvider } from "./context/ToastProvider";
import { onAuthChange } from "./utils/authToken";
import { clearRecentlyViewed } from "./utils/recentlyViewed";
import ErrorBoundary from "./components/ErrorBoundary";
import "./index.css";
import App from "./App.jsx";

/**
 * Wipe per-user client state when the user logs out. The cart already does
 * this via its own subscriber inside CartProvider; this listener handles
 * everything else that lives in localStorage outside of a context.
 */
onAuthChange(({ authenticated }) => {
  if (!authenticated) {
    clearRecentlyViewed();
  }
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <ToastProvider>
          <CartProvider>
            <SavedProvider>
              <AssistantProvider>
                <App />
              </AssistantProvider>
            </SavedProvider>
          </CartProvider>
        </ToastProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>
);
