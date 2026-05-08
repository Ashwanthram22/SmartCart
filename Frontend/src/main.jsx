import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { CartProvider } from "./context/CartProvider";
import { SavedProvider } from "./context/SavedProvider";
import { AssistantProvider } from "./context/AssistantProvider";
import { ToastProvider } from "./context/ToastProvider";
import "./index.css";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
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
  </StrictMode>
);
