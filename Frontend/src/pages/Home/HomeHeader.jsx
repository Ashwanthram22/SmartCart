import { Link, useNavigate } from "react-router-dom";
import { DEFAULT_PROFILE_AVATAR } from "../../data/profileDisplay";
import { useCart } from "../../hooks/useCart";
import { clearToken } from "../../utils/authToken";

const CATEGORIES = [
  { label: "AI Picks", icon: "sparkle", to: "/catalog/laptops" },
  { label: "Electronics", to: "/catalog/laptops" },
  { label: "Fashion", to: "/catalog/laptops" },
  { label: "Home & Living", to: "/catalog/laptops" },
  { label: "Beauty", to: "/catalog/laptops" },
  { label: "Sports", to: "/catalog/laptops" },
  { label: "Books", to: "/catalog/laptops" },
  { label: "Gifts", to: "/catalog/laptops" },
];

function HomeHeader() {
  const navigate = useNavigate();
  const { itemCount } = useCart();

  const handleLogout = () => {
    clearToken();
    navigate("/login", { replace: true });
  };

  return (
    <header className="home-header">
      <div className="home-header-top">
        <div className="home-header-top-inner">
          <Link to="/home" className="home-logo">
            SmartCart AI
          </Link>
          <nav className="home-nav-main" aria-label="Main">
            <a href="#" className="home-nav-link home-nav-link--active">
              History
            </a>
            <a href="#" className="home-nav-link">
              Recommendations
            </a>
            <a href="#" className="home-nav-link">
              Compare
            </a>
          </nav>
          <div className="home-search-wrap">
            <span className="home-search-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                <path d="m20 20-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </span>
            <input
              type="search"
              className="home-search-input"
              placeholder="Ask AI for product advice..."
              aria-label="Search products"
            />
          </div>
          <div className="home-header-actions">
            <Link to="/cart" className="home-icon-btn home-icon-btn--cart" aria-label="Cart">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path
                  d="M6 6h15l-1.5 9h-12L6 6zm0 0L5 3H2"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="9" cy="20" r="1.5" fill="currentColor" />
                <circle cx="18" cy="20" r="1.5" fill="currentColor" />
              </svg>
              {itemCount > 0 ? (
                <span className="home-cart-badge">{itemCount > 99 ? "99+" : itemCount}</span>
              ) : null}
            </Link>
            <Link to="/profile" className="home-profile-link" aria-label="Profile">
              <img src={DEFAULT_PROFILE_AVATAR} alt="" className="home-profile-avatar-img" width={32} height={32} />
            </Link>
            <button type="button" className="home-logout-btn" onClick={handleLogout}>
              Log out
            </button>
          </div>
        </div>
      </div>
      <div className="home-header-categories">
        <div className="home-header-categories-inner">
          {CATEGORIES.map((cat) => (
            <Link key={cat.label} to={cat.to} className="home-cat-link">
              {cat.icon === "sparkle" ? (
                <>
                  <span className="home-cat-sparkle" aria-hidden="true">
                    ✦
                  </span>
                  {cat.label}
                </>
              ) : (
                cat.label
              )}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}

export default HomeHeader;
