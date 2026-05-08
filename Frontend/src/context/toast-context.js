/**
 * Toast (snack) context — kept as a separate context module so the hook
 * file (`useToast.js`) can stay a leaf import. The provider lives in
 * `ToastProvider.jsx`.
 */
import { createContext } from "react";

export const ToastContext = createContext(null);
