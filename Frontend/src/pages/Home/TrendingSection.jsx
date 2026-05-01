/** Static editorial blocks — swap image URLs for Cloudinary when API is ready */
const SPOTLIGHT_IMG =
  "https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?auto=format&fit=crop&w=900&q=80";
const CARD_A_IMG =
  "https://images.unsplash.com/photo-1585771724684-38269d6639fd?auto=format&fit=crop&w=400&q=80";
const CARD_B_IMG =
  "https://images.unsplash.com/photo-1558002038-bb4237efdf97?auto=format&fit=crop&w=400&q=80";
const CARD_C_IMG =
  "https://images.unsplash.com/photo-1575311376447-675d6f139d79?auto=format&fit=crop&w=500&q=80";

function TrendingSection() {
  return (
    <section className="home-section home-trending">
      <div className="home-section-inner">
        <h2 className="home-trending-title">Trending Now</h2>
        <div className="home-trending-layout">
          <article className="home-trending-feature">
            <div className="home-trending-feature-text">
              <span className="home-trending-label">WEEKLY SPOTLIGHT</span>
              <h3>The New Era of Smart Lighting</h3>
              <p>
                Ambient intelligence that adapts to your mood, schedule, and energy goals — curated by
                SmartCart AI.
              </p>
              <button type="button" className="home-trending-shop-btn">
                Shop Collection →
              </button>
            </div>
            <div className="home-trending-feature-img-wrap">
              <img src={SPOTLIGHT_IMG} alt="" loading="lazy" />
            </div>
          </article>

          <div className="home-trending-side">
            <div className="home-trending-mini-grid">
              <article className="home-trending-mini home-trending-mini--lavender">
                <div>
                  <h4>Noise-Free Home</h4>
                  <p>Air quality meets whisper-quiet performance.</p>
                </div>
                <img src={CARD_A_IMG} alt="" loading="lazy" />
              </article>
              <article className="home-trending-mini home-trending-mini--lavender">
                <div>
                  <h4>Eco-Smart Living</h4>
                  <p>Reduce waste without sacrificing comfort.</p>
                </div>
                <img src={CARD_B_IMG} alt="" loading="lazy" />
              </article>
            </div>
            <article className="home-trending-wide">
              <div className="home-trending-wide-text">
                <h4>Personal Fitness AI</h4>
                <p>Gear scored for your goals and recovery patterns.</p>
                <a href="#" className="home-trending-browse">
                  Browse Gear →
                </a>
              </div>
              <img src={CARD_C_IMG} alt="" loading="lazy" />
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}

export default TrendingSection;
