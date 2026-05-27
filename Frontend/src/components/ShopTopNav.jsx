import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CATALOG_LIST_BASE, catalogListUrl } from "../constants/shopRoutes";
import { DEFAULT_PROFILE_AVATAR } from "../data/profileDisplay";
import { useCart } from "../hooks/useCart";
import { CartIcon } from "./CartIcon";
import { ShopNotificationBell } from "./ShopNotificationBell";
import { ShopThemeToggle } from "./ShopThemeToggle";
import "./ShopTopNav.css";
import "./ShopNotificationBell.css";
import "./ShopThemeToggle.css";

function SearchGlyph() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="m20 20-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Shared shop header: logo, pill search, cart + profile */
export function ShopTopNav({
  searchPlaceholder = "Search products...",
  cartActive = false,
  searchQuery = "",
  onSearchSubmit,
}) {
  const navigate = useNavigate();
  const { itemCount } = useCart();
  const [draft, setDraft] = useState(searchQuery);

  useEffect(() => {
    setDraft(searchQuery);
  }, [searchQuery]);

  const submitSearch = () => {
    const q = draft.trim();
    if (typeof onSearchSubmit === "function") {
      onSearchSubmit(q);
      return;
    }
    navigate(q ? catalogListUrl("AI Picks", q) : CATALOG_LIST_BASE);
  };

  return (
    <div className="shop-topnav-inner">
      <div className="shop-brand-nav">
        <Link to="/home" className="shop-logo">
          SmartCart AI
        </Link>
      </div>

      <div className="shop-actions">
        <form
          className="shop-search"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            submitSearch();
          }}
        >
          <SearchGlyph />
          <input
            type="search"
            name="q"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label="Search"
          />
        </form>
        <ShopNotificationBell classPrefix="shop" />
        <ShopThemeToggle classPrefix="shop" />
        <Link
          to="/cart"
          className={`shop-icon-btn shop-icon-btn--cart${cartActive ? " shop-icon-btn--active" : ""}`}
          aria-label={itemCount > 0 ? `Cart, ${itemCount} items` : "Cart"}
          {...(cartActive ? { "aria-current": "page" } : {})}
        >
          <span className="shop-cart-icon-wrap" aria-hidden="true">
            <CartIcon size={20} wide />
            {itemCount > 0 ? (
              <span className="shop-cart-badge">{itemCount > 99 ? "99+" : itemCount}</span>
            ) : null}
          </span>
        </Link>
        <Link to="/profile" className="shop-icon-btn shop-profile-thumb" aria-label="Profile">
          <img src={DEFAULT_PROFILE_AVATAR} alt="" width={28} height={28} />
        </Link>
      </div>
    </div>
  );
}
