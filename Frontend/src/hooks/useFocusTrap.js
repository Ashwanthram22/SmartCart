import { useEffect } from "react";

/**
 * Trap keyboard focus inside a container while it's mounted/active.
 *
 *   const ref = useRef(null);
 *   useFocusTrap(ref, isOpen);
 *   return isOpen ? <div ref={ref}>...</div> : null;
 *
 * Behaviour:
 *   - On activate, moves focus to the first focusable child (or the
 *     container itself if none are found).
 *   - Tab / Shift+Tab cycle within the container.
 *   - On deactivate, restores focus to whatever element was focused
 *     just before the trap activated (typically the trigger button).
 *   - Skips the work entirely when `active === false`.
 */
const FOCUSABLE = [
  "a[href]",
  "area[href]",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "button:not([disabled])",
  "iframe",
  "object",
  "embed",
  "[tabindex]:not([tabindex='-1'])",
  "[contenteditable]:not([contenteditable='false'])",
].join(",");

function getFocusable(container) {
  if (!container) return [];
  return Array.from(container.querySelectorAll(FOCUSABLE)).filter(
    (el) => !el.hasAttribute("inert") && el.offsetParent !== null
  );
}

export function useFocusTrap(containerRef, active) {
  useEffect(() => {
    if (!active) return undefined;
    const container = containerRef.current;
    if (!container) return undefined;

    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    // Move focus into the container on the next tick so any layout the
    // dialog does itself (auto-focus on an input, etc.) has finished.
    const moveFocus = () => {
      if (container.contains(document.activeElement)) return;
      const focusables = getFocusable(container);
      if (focusables.length > 0) {
        focusables[0].focus();
      } else {
        if (!container.hasAttribute("tabindex")) container.setAttribute("tabindex", "-1");
        container.focus();
      }
    };
    const raf = window.requestAnimationFrame(moveFocus);

    const onKeyDown = (e) => {
      if (e.key !== "Tab") return;
      const focusables = getFocusable(container);
      if (focusables.length === 0) {
        e.preventDefault();
        container.focus();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const current = document.activeElement;

      if (e.shiftKey) {
        if (current === first || !container.contains(current)) {
          e.preventDefault();
          last.focus();
        }
      } else if (current === last) {
        e.preventDefault();
        first.focus();
      }
    };

    container.addEventListener("keydown", onKeyDown);

    return () => {
      window.cancelAnimationFrame(raf);
      container.removeEventListener("keydown", onKeyDown);
      if (previouslyFocused && document.body.contains(previouslyFocused)) {
        try {
          previouslyFocused.focus({ preventScroll: true });
        } catch {
          previouslyFocused.focus();
        }
      }
    };
  }, [containerRef, active]);
}
