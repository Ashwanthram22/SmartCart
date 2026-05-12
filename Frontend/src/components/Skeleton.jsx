import "./Skeleton.css";

/**
 * Tiny visual placeholder used while async content loads. Renders a
 * shimmering box that respects the requested width/height/radius. Designed
 * to be composed: build whole "ghost" cards out of multiple `<Skeleton>`s
 * inside a wrapper that keeps the same layout as the real component.
 *
 * Honours `prefers-reduced-motion` automatically via the underlying CSS.
 */
export default function Skeleton({
  width,
  height = "1em",
  radius = 6,
  className = "",
  style: styleOverride,
  as: Tag = "span",
  inline = false,
  ariaLabel,
}) {
  const style = {
    width,
    height,
    borderRadius: typeof radius === "number" ? `${radius}px` : radius,
    display: inline ? "inline-block" : "block",
    ...styleOverride,
  };
  return (
    <Tag
      className={`sc-skeleton${className ? ` ${className}` : ""}`}
      style={style}
      aria-hidden={ariaLabel ? undefined : "true"}
      aria-label={ariaLabel}
      role={ariaLabel ? "status" : undefined}
    />
  );
}
