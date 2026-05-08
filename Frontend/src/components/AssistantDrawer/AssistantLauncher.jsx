import { useCallback, useEffect, useRef, useState } from "react";
import "./AssistantLauncher.css";

/**
 * Floating chatbot launcher.
 *
 * The button is draggable: pointer-down → move → pointer-up snaps it to a
 * new position. A short movement-threshold separates "drag" from "click" so
 * a stationary tap still opens the drawer.
 *
 * Position lives in the parent (AssistantProvider) — this component is fully
 * controlled. That lets the parent reset the position on logout / refresh
 * without the launcher needing to know anything about auth state.
 *
 * Works for mouse + touch + pen via the unified Pointer Events API.
 */

const DRAG_THRESHOLD_PX = 5;
const EDGE_PADDING = 16;
const BUTTON_SIZE = 56;
const BUTTON_SIZE_MOBILE = 52;

function buttonSize() {
  if (typeof window === "undefined") return BUTTON_SIZE;
  return window.innerWidth <= 480 ? BUTTON_SIZE_MOBILE : BUTTON_SIZE;
}

function clampToViewport({ left, top }) {
  if (typeof window === "undefined") return { left, top };
  const size = buttonSize();
  const maxLeft = Math.max(EDGE_PADDING, window.innerWidth - size - EDGE_PADDING);
  const maxTop = Math.max(EDGE_PADDING, window.innerHeight - size - EDGE_PADDING);
  return {
    left: Math.min(Math.max(EDGE_PADDING, left), maxLeft),
    top: Math.min(Math.max(EDGE_PADDING, top), maxTop),
  };
}

export default function AssistantLauncher({ onOpen, position, onPositionChange }) {
  const buttonRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  /**
   * Mutable drag bookkeeping. Refs (not state) so pointermove handlers don't
   * trigger re-renders on every pixel; only `position` (driven through the
   * parent's setter) re-renders during a drag.
   */
  const dragRef = useRef({
    active: false,
    moved: false,
    startX: 0,
    startY: 0,
    offsetX: 0,
    offsetY: 0,
  });
  const wasDragRef = useRef(false);

  /** Re-clamp when the viewport shrinks so the button never sits off-screen. */
  useEffect(() => {
    function onResize() {
      if (!position) return;
      const clamped = clampToViewport(position);
      if (clamped.left !== position.left || clamped.top !== position.top) {
        onPositionChange(clamped);
      }
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [position, onPositionChange]);

  const finishDrag = useCallback((event) => {
    const drag = dragRef.current;
    if (!drag.active) return;
    drag.active = false;
    setIsDragging(false);
    if (event && buttonRef.current?.hasPointerCapture?.(event.pointerId)) {
      try {
        buttonRef.current.releasePointerCapture(event.pointerId);
      } catch {
        /* noop */
      }
    }
    if (drag.moved) wasDragRef.current = true;
  }, []);

  const handlePointerDown = (event) => {
    if (event.button !== undefined && event.button !== 0) return;
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragRef.current = {
      active: true,
      moved: false,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    };
    try {
      buttonRef.current.setPointerCapture(event.pointerId);
    } catch {
      /* noop */
    }
  };

  const handlePointerMove = (event) => {
    const drag = dragRef.current;
    if (!drag.active) return;

    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;

    if (!drag.moved && Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) {
      drag.moved = true;
      setIsDragging(true);
    }

    if (drag.moved) {
      event.preventDefault();
      const next = clampToViewport({
        left: event.clientX - drag.offsetX,
        top: event.clientY - drag.offsetY,
      });
      onPositionChange(next);
    }
  };

  const handleClick = (event) => {
    // pointerup will fire a click even after a drag — suppress that one
    if (wasDragRef.current) {
      wasDragRef.current = false;
      event.preventDefault();
      return;
    }
    onOpen();
  };

  const inlineStyle = position
    ? { left: `${position.left}px`, top: `${position.top}px`, right: "auto", bottom: "auto" }
    : undefined;

  return (
    <button
      ref={buttonRef}
      type="button"
      className={`assist-launcher${isDragging ? " assist-launcher--dragging" : ""}`}
      style={inlineStyle}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishDrag}
      onPointerCancel={finishDrag}
      onClick={handleClick}
      aria-label="Open AI shopping assistant (drag to move)"
      title="Ask SmartCart AI"
    >
      <span className="assist-launcher-glyph" aria-hidden="true">
        ✦
      </span>
    </button>
  );
}
