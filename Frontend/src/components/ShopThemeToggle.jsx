import { Moon, Sun } from "lucide-react";
import { updatePreferences } from "../api/client";
import { useTheme } from "../context/ThemeProvider";
import { isAuthenticated } from "../utils/authToken";
import "./ShopThemeToggle.css";

/** Sun → light mode. Moon → dark mode. Icon shows the mode you switch to. */
export function ShopThemeToggle({ classPrefix = "shop" }) {
  const { resolved, setPreference } = useTheme();
  const isDark = resolved === "dark";

  const applyTheme = (theme) => {
    setPreference(theme);
    if (isAuthenticated()) {
      updatePreferences({ theme }).catch(() => {});
    }
  };

  return (
    <button
      type="button"
      className={`${classPrefix}-icon-btn ${classPrefix}-icon-btn--theme sc-theme-toggle`}
      onClick={() => applyTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
    >
      {isDark ? (
        <Sun size={20} aria-hidden="true" />
      ) : (
        <Moon size={20} aria-hidden="true" />
      )}
    </button>
  );
}
