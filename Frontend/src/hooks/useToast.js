import { useContext } from "react";
import { ToastContext } from "../context/toast-context";

/**
 * Imperative toast hook.
 *
 *   const toast = useToast();
 *   toast.success("Order cancelled");
 *   toast.error("Could not save changes");
 *   toast.info("Working on it…");
 *   toast.show({ message: "Custom", variant: "success", duration: 5000 });
 */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // The provider is mounted at the root in main.jsx, so missing context is
    // a developer mistake (component rendered outside ToastProvider). Return
    // no-op fns so any leftover callsite during dev hot-reload doesn't throw.
    const noop = () => {};
    return { show: noop, success: noop, error: noop, info: noop, dismiss: noop };
  }
  return ctx;
}
