import cartIconSrc from "../assets/cart-icon.png";
import "./CartIcon.css";

/**
 * Shared cart image — uses `src/assets/cart-icon.png`.
 * Parent controls semantics (e.g. `aria-label` on the button/link); pass `alt` only when the image is meaningful alone.
 */
export function CartIcon({ size = 26, className, alt = "", ...rest }) {
  return (
    <img
      src={cartIconSrc}
      alt={alt}
      width={30}
      height={size}
      className={["cart-icon-img", className].filter(Boolean).join(" ")}
      draggable={false}
      {...rest}
    />
  );
}
