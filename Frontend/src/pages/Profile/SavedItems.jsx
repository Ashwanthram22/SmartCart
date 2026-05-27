import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CATALOG_LIST_BASE, productDetailUrl } from "../../constants/shopRoutes";
import { isValidSegment } from "../../constants/shopSegments";
import { PRODUCT_CATALOG_CATEGORIES } from "../../constants/shopSegments";
import AdmDropdown from "../../components/AdmDropdown";
import { ProfileLayout } from "./ProfileLayout";
import { useCart } from "../../hooks/useCart";
import { useSaved } from "../../hooks/useSaved";
import usePageMeta from "../../hooks/usePageMeta";
import { CartIcon } from "../../components/CartIcon";
import { formatMoney as formatUsd } from "../../utils/money";
import {
  savedLineCategory,
  savedLineId,
  savedLineImage,
  savedLinePrice,
  savedLineRating,
  savedLineSubtitle,
  savedLineTitle,
} from "../../utils/savedLine";
import "./SavedItems.css";

const CATEGORY_FILTER_OPTIONS = [
  { value: "all", label: "All Categories" },
  ...PRODUCT_CATALOG_CATEGORIES.map((name) => ({
    value: name,
    label: name,
  })),
];

function segmentForSavedLine(line) {
  const cat = line?.product?.category;
  if (cat && isValidSegment(cat)) return cat;
  return "AI Picks";
}

function IconSearch() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="m20 20-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconStar() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 6h18M8 6V4h8v2m-8 0h8m-9 4v10h10V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconSparkle() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconPlusCircle() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="saved-empty-icon">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function SavedItems() {
  usePageMeta({
    title: "Saved items",
    description: "All the products you've saved for later on SmartCart AI.",
  });

  const navigate = useNavigate();
  const { addItem } = useCart();
  const { items, removeSaved } = useSaved();
  const [activeCategory, setActiveCategory] = useState("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((line) => {
      const catOk =
        activeCategory === "all" ||
        savedLineCategory(line) === activeCategory;
      const title = savedLineTitle(line).toLowerCase();
      const sub = savedLineSubtitle(line.product).toLowerCase();
      const textOk = !q || title.includes(q) || sub.includes(q);
      return catOk && textOk;
    });
  }, [items, activeCategory, query]);

  const handleAddToCart = (line, event) => {
    event?.stopPropagation();
    if (!line?.product) return;
    addItem(line.product);
  };

  const openProductDetail = (line) => {
    const id = savedLineId(line);
    if (!id) return;
    navigate(productDetailUrl(segmentForSavedLine(line), id, ""));
  };

  const handleCardKeyDown = (line, event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openProductDetail(line);
    }
  };

  return (
    <ProfileLayout>
      <div className="saved-items">
        <div className="saved-toolbar">
          <h2 className="saved-toolbar-title">My Saved Finds</h2>
          <label className="saved-search">
            <IconSearch />
            <input
              type="search"
              placeholder="Search saved items..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search saved items"
            />
          </label>
        </div>

        <header className="saved-header">
          <div className="saved-header-text">
            <h1 className="saved-page-title">Saved Items</h1>
            <p className="saved-page-lede">
              Curated by your AI shopping assistant based on your preferences.
            </p>
          </div>
          <div className="saved-category-filter">
            <AdmDropdown
              className="saved-category-dd"
              value={activeCategory}
              options={CATEGORY_FILTER_OPTIONS}
              onChange={setActiveCategory}
              ariaLabel="Filter saved items by category"
              menuAlign="right"
            />
          </div>
        </header>

        <div className="saved-grid">
          {filtered.map((line) => {
            const id = savedLineId(line);
            const title = savedLineTitle(line);
            const subtitle = savedLineSubtitle(line.product);
            return (
              <article
                key={id}
                className="saved-card"
                role="button"
                tabIndex={0}
                onClick={() => openProductDetail(line)}
                onKeyDown={(event) => handleCardKeyDown(line, event)}
              >
                <div className="saved-card-media">
                  <img src={savedLineImage(line)} alt="" loading="lazy" />
                  <div className="saved-card-rating">
                    <IconStar />
                    <span>{savedLineRating(line).toFixed(1)}</span>
                  </div>
                  <button
                    type="button"
                    className="saved-card-remove"
                    aria-label={`Remove ${title} from saved`}
                    onClick={(event) => {
                      event.stopPropagation();
                      removeSaved(id);
                    }}
                  >
                    <IconTrash />
                  </button>
                </div>
                <div className="saved-card-body">
                  <div className="saved-card-row">
                    <div>
                      <h3 className="saved-card-title">{title}</h3>
                      <p className="saved-card-sub">{subtitle}</p>
                    </div>
                    <p className="saved-card-price">{formatUsd(savedLinePrice(line))}</p>
                  </div>
                  <button
                    type="button"
                    className="saved-add-cart"
                    onClick={(event) => handleAddToCart(line, event)}
                  >
                    <CartIcon size={26} />
                    Add to Cart
                  </button>
                </div>
              </article>
            );
          })}

          <aside className="saved-ai-card">
            <div className="saved-ai-glow" aria-hidden="true" />
            <div className="saved-ai-inner">
              <div className="saved-ai-kicker">
                <IconSparkle />
                <span>AI Comparison Insight</span>
              </div>
              <h2 className="saved-ai-title">Price Drop Alert!</h2>
              <p className="saved-ai-text">
                We&apos;ve noticed that 3 items in your saved list have dropped in price by an average of 15% in the
                last 24 hours. Move them to your cart now to secure the savings.
              </p>
              <button type="button" className="saved-ai-btn">
                Review All Changes
              </button>
            </div>
          </aside>
        </div>

        <section className="saved-empty-cta" aria-labelledby="saved-empty-heading">
          <IconPlusCircle />
          <h3 id="saved-empty-heading" className="saved-empty-title">
            Want to save more?
          </h3>
          <p className="saved-empty-text">Continue exploring products to build your perfect collection.</p>
          <Link to={CATALOG_LIST_BASE} className="saved-empty-link">
            Browse Trending Items
          </Link>
        </section>

        <footer className="saved-footer">
          <div className="saved-footer-inner">
            <div>
              <span className="saved-footer-brand">SmartCart AI</span>
              <p className="saved-footer-copy">© 2024 SmartCart AI. Intelligent shopping for the future.</p>
            </div>
            <div className="saved-footer-links">
              <a href="#">Privacy Policy</a>
              <a href="#">Terms of Service</a>
              <a href="#">Help Center</a>
              <a href="#">Contact</a>
            </div>
          </div>
        </footer>
      </div>
    </ProfileLayout>
  );
}
