import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { isAuthenticated } from "../utils/authToken";
import { useFocusTrap } from "../hooks/useFocusTrap";
import "./KeyboardShortcuts.css";

const SHORTCUTS = [
  { combo: ["/"], description: "Focus the search box" },
  { combo: ["?"], description: "Show this help dialog" },
  { combo: ["g", "h"], description: "Go to Home" },
  { combo: ["g", "c"], description: "Go to Cart" },
  { combo: ["g", "p"], description: "Go to Profile" },
  { combo: ["g", "o"], description: "Go to Order history" },
  { combo: ["g", "s"], description: "Go to Saved items" },
  { combo: ["g", "a"], description: "Go to Address book" },
  { combo: ["Esc"], description: "Close any open dialog" },
];

/** Routes that explicitly opt-out of shortcuts (mostly the auth pages
 *  where there's no top-nav and the user is mid-form). */
function shouldEnableShortcuts(pathname) {
  if (!pathname) return false;
  if (pathname.startsWith("/login")) return false;
  if (pathname.startsWith("/register")) return false;
  if (pathname.startsWith("/forgot-password")) return false;
  if (pathname.startsWith("/reset-password")) return false;
  if (pathname.startsWith("/auth/")) return false;
  return true;
}

/** True when the user is currently typing into a form field — we don't
 *  want `/` to steal their keystroke. */
function isTypingInField(target) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return false;
}

function focusSearch() {
  // Try the topnav search first; fall back to any visible search input.
  const el =
    document.querySelector(".shop-search input[type='search']") ||
    document.querySelector("input[type='search']");
  if (el instanceof HTMLInputElement) {
    el.focus();
    el.select();
    return true;
  }
  return false;
}

/**
 * Top-level component (mounted from `App`) that:
 *   - listens for global keystrokes
 *   - dispatches the user-facing shortcut actions
 *   - renders the `?` help dialog as needed
 *
 * Keyboard shortcuts only activate when the user isn't typing in a
 * form field, isn't holding a modifier key (so it doesn't clash with
 * browser shortcuts like Ctrl+/), and isn't on a route where they're
 * disabled (login, register, etc.).
 */
export default function KeyboardShortcuts() {
  const navigate = useNavigate();
  const location = useLocation();
  const [helpOpen, setHelpOpen] = useState(false);
  const gPressedAt = useRef(0);
  const dialogRef = useRef(null);
  useFocusTrap(dialogRef, helpOpen);

  const closeHelp = useCallback(() => setHelpOpen(false), []);

  const goAuthed = useCallback(
    (path) => {
      if (!isAuthenticated()) {
        navigate("/login");
      } else {
        navigate(path);
      }
    },
    [navigate]
  );

  useEffect(() => {
    if (!shouldEnableShortcuts(location.pathname)) return undefined;

    const onKeyDown = (e) => {
      // Esc always closes the help dialog (and lets other Esc handlers
      // run via stopPropagation: false).
      if (e.key === "Escape" && helpOpen) {
        setHelpOpen(false);
        return;
      }

      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingInField(e.target)) return;

      // `?` (which is Shift+/ on most layouts) → help. Check shift+/ and
      // the literal "?" key for layouts that map it differently.
      if (e.key === "?" || (e.key === "/" && e.shiftKey)) {
        e.preventDefault();
        setHelpOpen((prev) => !prev);
        return;
      }

      if (e.key === "/") {
        if (focusSearch()) e.preventDefault();
        return;
      }

      // Two-key chord: `g` then a destination letter.
      if (e.key === "g") {
        gPressedAt.current = Date.now();
        return;
      }

      if (gPressedAt.current && Date.now() - gPressedAt.current < 1200) {
        const dest = {
          h: "/home",
          c: "/cart",
          p: "/profile",
          o: "/profile/orders",
          s: "/profile/saved",
          a: "/profile/addresses",
        }[e.key];
        gPressedAt.current = 0;
        if (dest) {
          e.preventDefault();
          if (dest === "/home") navigate(dest);
          else goAuthed(dest);
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [location.pathname, helpOpen, navigate, goAuthed]);

  if (!helpOpen) return null;

  return (
    <div
      className="ks-overlay"
      role="presentation"
      onClick={closeHelp}
    >
      <div
        ref={dialogRef}
        className="ks-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ks-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="ks-head">
          <div>
            <h2 id="ks-title" className="ks-title">Keyboard shortcuts</h2>
            <p className="ks-subtitle">
              Press{" "}
              <kbd>?</kbd> any time to open this dialog.
            </p>
          </div>
          <button
            type="button"
            className="ks-close"
            onClick={closeHelp}
            aria-label="Close shortcuts"
          >
            ×
          </button>
        </header>
        <ul className="ks-list">
          {SHORTCUTS.map((s) => (
            <li key={s.combo.join("+")} className="ks-row">
              <span className="ks-combo">
                {s.combo.map((k, i) => (
                  <span key={`${k}-${i}`} className="ks-combo-key">
                    <kbd>{k}</kbd>
                    {i < s.combo.length - 1 ? (
                      <span className="ks-combo-then" aria-hidden="true">
                        then
                      </span>
                    ) : null}
                  </span>
                ))}
              </span>
              <span className="ks-desc">{s.description}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
