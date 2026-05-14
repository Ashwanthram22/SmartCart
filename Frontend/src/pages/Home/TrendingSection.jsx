import { Link } from "react-router-dom";
import { catalogListUrl } from "../../constants/shopRoutes";
import ProductCard from "./ProductCard";

function TrendingSection({ products, loading, error }) {
  const list = Array.isArray(products) ? products.slice(0, 4) : [];

  return (
    <section className="home-section home-trending">
      <div className="home-section-inner">
        <div className="home-section-head">
          <div>
            <h2 className="home-trending-title">Trending Now</h2>
          </div>
          <Link to={catalogListUrl("Trending", "")} className="home-section-link">
            View all →
          </Link>
        </div>

        {error ? <p className="home-section-error">{error}</p> : null}

        <div className="home-product-grid">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="home-product-card home-product-card--skeleton" />
            ))
          ) : list.length > 0 ? (
            list.map((product, index) => (
              <ProductCard
                key={product.id ?? index}
                index={index}
                product={product}
                badgeOverride="TRENDING"
              />
            ))
          ) : (
            <p className="home-section-empty">Nothing trending right now. Check back soon.</p>
          )}
        </div>
      </div>
    </section>
  );
}

export default TrendingSection;
