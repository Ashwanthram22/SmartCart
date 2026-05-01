function HomeFooter() {
  return (
    <footer className="home-footer">
      <div className="home-footer-inner">
        <div className="home-footer-brand">
          <span className="home-footer-logo">SmartCart AI</span>
          <p>© 2026 SmartCart AI. Intelligent shopping for the future.</p>
        </div>
        <nav className="home-footer-nav" aria-label="Footer">
          <a href="#">Privacy Policy</a>
          <a href="#">Terms of Service</a>
          <a href="#">Help Center</a>
          <a href="#">Contact</a>
        </nav>
        <div className="home-footer-social">
          <button type="button" className="home-footer-icon" aria-label="Language">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
              <path
                d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>
          </button>
          <button type="button" className="home-footer-icon" aria-label="Share">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="18" cy="5" r="3" stroke="currentColor" strokeWidth="2" />
              <circle cx="6" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
              <circle cx="18" cy="19" r="3" stroke="currentColor" strokeWidth="2" />
              <path d="m8.59 13.51 6.83 3.98M15.41 6.51 8.59 10.49" stroke="currentColor" strokeWidth="2" />
            </svg>
          </button>
        </div>
      </div>
    </footer>
  );
}

export default HomeFooter;
