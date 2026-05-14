import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import "./AdmDropdown.css";

/* ============================================================================
 * AdmDropdown
 *
 * Shared, accessible custom dropdown — pill-style trigger, curved white menu,
 * per-option hover and active styles. Used across admin, product list, and settings.
 *
 * The menu is portalled to `document.body` so it is not clipped by overflow.
 *
 * Props
 * -----
 * - value:     currently selected value (string)
 * - options:   [{ value, label }, ...]
 * - onChange:  (newValue) => void
 * - disabled:  disables the trigger
 * - ariaLabel: accessible label for the trigger button
 * - menuAlign: "left" | "right" (default "left")
 * - className: extra class for the trigger wrapper (.adm-dd)
 * ==========================================================================*/
export default function AdmDropdown({
  value,
  options,
  onChange,
  disabled = false,
  ariaLabel,
  menuAlign = "left",
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState(null);
  const wrapRef = useRef(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const menuId = useId();

  const selected = options.find((o) => o.value === value) || options[0];

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const margin = 8;
    const gap = 6;
    const measuredHeight =
      menuRef.current?.offsetHeight || options.length * 40 + 16;
    const spaceBelow = window.innerHeight - rect.bottom - margin - gap;
    const spaceAbove = rect.top - margin - gap;
    const fitsBelow = measuredHeight <= spaceBelow;
    const placeAbove = !fitsBelow && spaceAbove > spaceBelow;
    const maxHeight = placeAbove
      ? Math.max(120, spaceAbove)
      : Math.max(120, spaceBelow);
    setMenuPos({
      top: placeAbove
        ? Math.max(margin, rect.top - gap - Math.min(measuredHeight, maxHeight))
        : rect.bottom + gap,
      left: menuAlign === "right" ? null : rect.left,
      right: menuAlign === "right" ? window.innerWidth - rect.right : null,
      minWidth: rect.width,
      maxHeight,
      placement: placeAbove ? "top" : "bottom",
    });
  }, [menuAlign, options.length]);

  useLayoutEffect(() => {
    if (!open) return undefined;
    updatePosition();
    const raf = requestAnimationFrame(() => updatePosition());
    const onScroll = () => updatePosition();
    const onResize = () => updatePosition();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return undefined;
    const onDocClick = (e) => {
      const target = e.target;
      if (
        wrapRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    window.addEventListener("mousedown", onDocClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDocClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const choose = (next) => {
    if (next !== value) onChange?.(next);
    setOpen(false);
    buttonRef.current?.focus();
  };

  const menu = open && menuPos ? (
    <ul
      ref={menuRef}
      id={menuId}
      role="listbox"
      aria-label={ariaLabel}
      className={
        "adm-dd-menu" +
        (menuPos.placement === "top" ? " adm-dd-menu--top" : " adm-dd-menu--bottom")
      }
      style={{
        position: "fixed",
        top: `${menuPos.top}px`,
        left: menuPos.left != null ? `${menuPos.left}px` : "auto",
        right: menuPos.right != null ? `${menuPos.right}px` : "auto",
        minWidth: `${menuPos.minWidth}px`,
        maxHeight: `${menuPos.maxHeight}px`,
        overflowY: "auto",
      }}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <li key={opt.value || "__empty__"}>
            <button
              type="button"
              role="option"
              aria-selected={active}
              className={
                "adm-dd-option" +
                (active ? " adm-dd-option--active" : "")
              }
              onClick={() => choose(opt.value)}
            >
              {opt.label}
            </button>
          </li>
        );
      })}
    </ul>
  ) : null;

  return (
    <div
      ref={wrapRef}
      className={
        "adm-dd" +
        (open ? " adm-dd--open" : "") +
        (className ? ` ${className}` : "")
      }
    >
      <button
        ref={buttonRef}
        type="button"
        className="adm-dd-trigger"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={ariaLabel}
      >
        <span className="adm-dd-label">{selected?.label}</span>
        <ChevronDown
          size={14}
          aria-hidden="true"
          className="adm-dd-caret"
        />
      </button>
      {menu ? createPortal(menu, document.body) : null}
    </div>
  );
}
