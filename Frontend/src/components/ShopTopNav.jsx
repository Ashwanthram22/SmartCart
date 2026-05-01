import { Link } from "react-router-dom";
import { DEFAULT_PROFILE_AVATAR } from "../data/profileDisplay";
import { useCart } from "../hooks/useCart";
import { CartIcon } from "./CartIcon";
import "./ShopTopNav.css";

/** Same top bar as laptop catalog: dark logo, pill search, cart + profile */
export function ShopTopNav({ searchPlaceholder = "Search laptops...", cartActive = false }) {
  const { itemCount } = useCart();

  return (
    <div className="shop-topnav-inner">
      <div className="shop-brand-nav">
        <Link to="/home" className="shop-logo">
          SmartCart AI
        </Link>
      </div>

      <div className="shop-actions">
        <div className="shop-search">
          <span className="shop-search-glyph" aria-hidden="true">
            ⌕
          </span>
          <input type="search" placeholder={searchPlaceholder} aria-label="Search" />
        </div>
        <Link
          to="/cart"
          className={`shop-icon-btn shop-icon-btn--cart${cartActive ? " shop-icon-btn--cart-active" : ""}`}
          aria-label="Cart"
          {...(cartActive ? { "aria-current": "page" } : {})}
        >
          <CartIcon />
          {itemCount > 0 ? (
            <span className="shop-cart-badge">{itemCount > 99 ? "99+" : itemCount}</span>
          ) : null}
        </Link>
        <Link to="/profile" className="shop-icon-btn shop-profile-thumb" aria-label="Profile">
          <img src={DEFAULT_PROFILE_AVATAR} alt="" width={28} height={28} />
        </Link>
      </div>
    </div>
  );
}
