/**
 * Footer columns rendered as plain data so editors can tweak labels without
 * touching markup. `href: "#"` is the placeholder until each section has a
 * real route.
 */
const FOOTER_COLUMNS = [
  {
    title: "Get to Know Us",
    links: [
      { label: "About SmartCart", href: "#" },
      { label: "Careers", href: "#" },
      { label: "Press Releases", href: "#" },
      { label: "SmartCart AI Lab", href: "#" },
      { label: "Sustainability", href: "#" },
      { label: "Our Blog", href: "#" },
    ],
  },
  {
    title: "Connect with Us",
    links: [
      { label: "Facebook", href: "#" },
      { label: "Twitter / X", href: "#" },
      { label: "Instagram", href: "#" },
      { label: "LinkedIn", href: "#" },
      { label: "YouTube", href: "#" },
    ],
  },
  {
    title: "Make Money with Us",
    links: [
      { label: "Sell on SmartCart", href: "#" },
      { label: "Become an Affiliate", href: "#" },
      { label: "Advertise Your Products", href: "#" },
      { label: "Partner Brands", href: "#" },
      { label: "SmartCart for Vendors", href: "#" },
    ],
  },
  {
    title: "Let Us Help You",
    links: [
      { label: "Your Account", href: "#" },
      { label: "Your Orders", href: "#" },
      { label: "Returns Centre", href: "#" },
      { label: "Shipping Info", href: "#" },
      { label: "Help Center", href: "#" },
      { label: "Contact Us", href: "#" },
    ],
  },
];

/**
 * Sister-brand modules that mirror Amazon's "AbeBooks / IMDb / Audible" rail.
 * Kept on-theme for SmartCart AI's product universe.
 */
const FOOTER_SERVICES = [
  { name: "SmartCart Cloud", desc: "Scalable Cloud\nCommerce Infra" },
  { name: "SmartCart Business", desc: "Procurement For\nYour Business" },
  { name: "SmartReads", desc: "Books, Art\n& Collectibles" },
  { name: "ShopAtlas", desc: "Designer\nFashion Brands" },
  { name: "AeroLearn", desc: "AI Courses\n& Bootcamps" },
  { name: "SmartCart Audio", desc: "Audiobooks\n& Podcasts" },
  { name: "CartTV", desc: "Movies, TV\n& Series" },
  { name: "SmartCart Pay", desc: "Wallet, Cashback\n& Rewards" },
];

const FOOTER_LEGAL = [
  { label: "Conditions of Use & Sale", href: "#" },
  { label: "Privacy Notice", href: "#" },
  { label: "Interest-Based Ads", href: "#" },
];

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function HomeFooter() {
  return (
    <footer className="home-footer" role="contentinfo">
      {/* <button
        type="button"
        className="home-footer-back-to-top"
        onClick={scrollToTop}
      >
        Back to top
      </button> */}

      <div className="home-footer-main">
        <div className="home-footer-cols">
          {FOOTER_COLUMNS.map((col) => (
            <nav
              key={col.title}
              className="home-footer-col"
              aria-label={col.title}
            >
              <h3 className="home-footer-col-title">{col.title}</h3>
              <ul className="home-footer-col-list">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a href={link.href}>{link.label}</a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>

      {/* <div className="home-footer-band">
        <div className="home-footer-band-inner">
          <span className="home-footer-logo" aria-label="SmartCart AI">
            <span aria-hidden="true">✦</span> SmartCart AI
          </span>

          <button type="button" className="home-footer-pill" aria-label="Change language">
            <span aria-hidden="true">🌐</span> English
          </button>

          <button type="button" className="home-footer-pill" aria-label="Change country/region">
            <span aria-hidden="true">🇮🇳</span> India
          </button>
        </div>
      </div> */}

      <div className="home-footer-bottom">
        <div className="home-footer-bottom-inner">
          {/* <ul className="home-footer-services" aria-label="More from SmartCart">
            {FOOTER_SERVICES.map((service) => (
              <li key={service.name} className="home-footer-service">
                <span className="home-footer-service-name">{service.name}</span>
                <span className="home-footer-service-desc">{service.desc}</span>
              </li>
            ))}
          </ul> */}

          <nav className="home-footer-legal" aria-label="Legal">
            {FOOTER_LEGAL.map((link) => (
              <a key={link.label} href={link.href}>
                {link.label}
              </a>
            ))}
          </nav>

          <p className="home-footer-copy">
            © 1996–{new Date().getFullYear()}, SmartCart Inc. or its affiliates
          </p>
        </div>
      </div>
    </footer>
  );
}

export default HomeFooter;
