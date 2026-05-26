import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getPreferences } from "../api/client";
import { isAuthenticated, onAuthChange } from "../utils/authToken";
import {
  THEME_CHANGED,
  applyResolvedTheme,
  getStoredThemePreference,
  resolveTheme,
  emitThemeChanged,
  setStoredThemePreference,
} from "../utils/theme";

const ThemeContext = createContext({
  preference: "system",
  resolved: "light",
  setPreference: () => {},
});

export function ThemeProvider({ children }) {
  const [preference, setPreferenceState] = useState(getStoredThemePreference);
  const [resolved, setResolved] = useState(() =>
    resolveTheme(getStoredThemePreference())
  );

  const apply = useCallback((pref) => {
    const next = resolveTheme(pref);
    setResolved(next);
    applyResolvedTheme(next);
  }, []);

  const setPreference = useCallback(
    (pref) => {
      const value = pref === "light" || pref === "dark" || pref === "system" ? pref : "system";
      setPreferenceState(value);
      setStoredThemePreference(value);
      apply(value);
      emitThemeChanged({ preference: value, resolved: resolveTheme(value) });
    },
    [apply]
  );

  useEffect(() => {
    apply(preference);
  }, [preference, apply]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (preference === "system") apply("system");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [preference, apply]);

  useEffect(() => {
    const loadFromAccount = async () => {
      if (!isAuthenticated()) return;
      try {
        const { preferences } = await getPreferences();
        if (
          preferences?.theme === "light" ||
          preferences?.theme === "dark" ||
          preferences?.theme === "system"
        ) {
          setPreferenceState(preferences.theme);
          setStoredThemePreference(preferences.theme);
          apply(preferences.theme);
        }
      } catch {
        /* keep local / system */
      }
    };
    loadFromAccount();
    return onAuthChange(({ authenticated }) => {
      if (authenticated) loadFromAccount();
      else {
        const local = getStoredThemePreference();
        setPreferenceState(local);
        apply(local);
      }
    });
  }, [apply]);

  useEffect(() => {
    const onThemeEvent = (e) => {
      const pref = e.detail?.preference;
      if (pref === "light" || pref === "dark" || pref === "system") {
        setPreferenceState(pref);
        apply(pref);
      }
    };
    window.addEventListener(THEME_CHANGED, onThemeEvent);
    return () => window.removeEventListener(THEME_CHANGED, onThemeEvent);
  }, [apply]);

  const value = useMemo(
    () => ({ preference, resolved, setPreference }),
    [preference, resolved, setPreference]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
