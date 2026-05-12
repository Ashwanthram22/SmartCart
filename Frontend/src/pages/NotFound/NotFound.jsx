import { useState } from "react";
import usePageMeta from "../../hooks/usePageMeta";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Compass,
  Headphones,
  Home as HomeIcon,
  Search,
  ShoppingBag,
  Smartphone,
} from "lucide-react";
import { isAuthenticated } from "../../utils/authToken";
import "./NotFound.css";

/**
 * Hand-picked "popular categories" surfaced on the 404 page so a typo
 * doesn't dead-end the visitor. Each routes into the catalog with the
 * matching segment pre-selected.
 */
const POPULAR_CATEGORIES = [
  { id: "electronics", label: "Electronics", segment: "Electronics", Icon: Smartphone },
  { id: "audio", label: "Audio", segment: "Accessories", Icon: Headphones },
  { id: "mobiles", label: "Mobiles", segment: "Mobiles", Icon: Smartphone },
  { id: "home", label: "Home & Kitchen", segment: "Home & Kitchen", Icon: HomeIcon },
  { id: "trending", label: "Trending", segment: "Trending", Icon: Compass },
  { id: "all", label: "All products", segment: "AI Picks", Icon: ShoppingBag },
];

/**
 * Friendly 404 page. Replaces the previous behaviour where every unknown
 * URL silently redirected to root, which made typos invisible. Includes a
 * search box that routes into the catalog (works for both signed-in and
 * signed-out visitors — the catalog itself enforces auth).
 */
export default function NotFound() {
  usePageMeta({
    title: "Page not found (404)",
    description: "The page you're looking for doesn't exist on SmartCart AI.",
  });

  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearch] = useState("");

  const authed = isAuthenticated();
  const homeHref = authed ? "/home" : "/login";
  const homeLabel = authed ? "Back to home" : "Back to login";

  const handleSearch = (e) => {
    e.preventDefault();
    const q = search.trim();
    if (!q) {
      navigate("/catalog/products");
      return;
    }
    navigate(`/catalog/products?q=${encodeURIComponent(q)}`);
  };

  return (
    <main id="main-content" className="nf-page">
      <div className="nf-shell">
        <div className="nf-card">
          <div className="nf-eyebrow">
            <span aria-hidden="true">✦</span>
            <span>SmartCart AI</span>
          </div>

          <p className="nf-code">404</p>
          <h1 className="nf-title">We couldn&apos;t find that page</h1>
          <p className="nf-lede">
            The URL <code className="nf-url">{location.pathname}</code> doesn&apos;t
            exist (or it moved). Try the search below or jump to one of the popular
            categories.
          </p>

          <form className="nf-search" onSubmit={handleSearch} role="search">
            <Search size={18} aria-hidden="true" className="nf-search-icon" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Try 'wireless headphones', 'laptop', 'OmniWatch'…"
              aria-label="Search the catalog"
              autoFocus
            />
            <button type="submit" className="nf-search-submit">
              Search
            </button>
          </form>

          <div className="nf-actions">
            <Link to={homeHref} className="nf-btn nf-btn--ghost">
              <ArrowLeft size={16} aria-hidden="true" />
              {homeLabel}
            </Link>
            <Link to="/catalog/products" className="nf-btn nf-btn--primary">
              Browse products
            </Link>
          </div>
        </div>

        <section className="nf-popular" aria-labelledby="nf-popular-heading">
          <h2 id="nf-popular-heading" className="nf-popular-title">
            Popular categories
          </h2>
          <div className="nf-popular-grid">
            {POPULAR_CATEGORIES.map(({ id, label, segment, Icon }) => (
              <Link
                key={id}
                to={`/catalog/products?segment=${encodeURIComponent(segment)}`}
                className="nf-popular-card"
              >
                <span className="nf-popular-icon" aria-hidden="true">
                  <Icon size={22} />
                </span>
                <span className="nf-popular-label">{label}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
