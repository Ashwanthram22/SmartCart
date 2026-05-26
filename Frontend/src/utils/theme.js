const STORAGE_KEY = "smartcart-theme";

export function getStoredThemePreference() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "light" || v === "dark" || v === "system") return v;
  } catch {
    /* ignore */
  }
  return "system";
}

export function setStoredThemePreference(theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* ignore */
  }
}

export function resolveTheme(preference) {
  if (preference === "dark") return "dark";
  if (preference === "light") return "light";
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return "light";
}

export function applyResolvedTheme(resolved) {
  document.documentElement.setAttribute("data-theme", resolved);
}

export const THEME_CHANGED = "smartcart:theme-changed";

export function emitThemeChanged(detail) {
  window.dispatchEvent(new CustomEvent(THEME_CHANGED, { detail }));
}
