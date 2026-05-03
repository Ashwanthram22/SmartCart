import cartIconSrc from "../assets/cart-icon.png";
import "./CartIcon.css";

/**
 * Shared cart image — uses `src/assets/cart-icon.png`.
 * Parent controls semantics (e.g. `aria-label` on the button/link); pass `alt` only when the image is meaningful alone.
 */
export function CartIcon({ size = 22, className, alt = "", style, ...rest }) {
  const dim = Number(size) || 22;
  return (
    <img
      src={cartIconSrc}
      alt={alt}
      width={dim}
      height={dim}
      className={["cart-icon-img", className].filter(Boolean).join(" ")}
      draggable={false}
      {...rest}
      style={{ width: dim, height: dim, maxWidth: dim, maxHeight: dim, ...style }}
    />
  );
}
