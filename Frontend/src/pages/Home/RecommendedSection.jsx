import ProductCard from "./ProductCard";

function RecommendedSection({ products, loading, error }) {
  const list = Array.isArray(products) ? products.slice(0, 4) : [];

  return (
    <section id="home-ai-recommendations" className="home-section home-recommended">
      <div className="home-section-inner">
        <div className="home-section-head">
          <div>
            <span className="home-section-kicker">PERSONALIZED INTELLIGENCE</span>
            <h2 className="home-section-title">Recommended for You</h2>
          </div>
          <a href="#" className="home-section-link">
            View all picks →
          </a>
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
                product={product}
                showAskAi={index === 3}
              />
            ))
          ) : (
            <p className="home-section-empty">No recommendations yet. Check back soon.</p>
          )}
        </div>
      </div>
    </section>
  );
}

export default RecommendedSection;
