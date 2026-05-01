function HomeHero() {
  return (
    <section className="home-hero">
      <div
        className="home-hero-bg"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(15, 15, 25, 0.82) 0%, rgba(15, 15, 25, 0.35) 55%, rgba(15, 15, 25, 0.2) 100%), url(https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&w=1600&q=80)",
        }}
      />
      <div className="home-hero-inner">
        <span className="home-hero-badge">FLASH INTELLIGENCE DEALS</span>
        <h1 className="home-hero-title">Future of Shopping is Intelligent.</h1>
        <p className="home-hero-sub">
          Save up to 40% on AI-curated electronics that match your lifestyle perfectly.
        </p>
        <div className="home-hero-actions">
          <button type="button" className="home-btn home-btn--primary">
            Explore Deals
          </button>
          <button type="button" className="home-btn home-btn--outline">
            Learn More
          </button>
        </div>
      </div>
    </section>
  );
}

export default HomeHero;
