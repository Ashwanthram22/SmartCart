import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { clearToken } from "../../utils/authToken";
import { ShopTopNav } from "../../components/ShopTopNav";
import "./Profile.css";

function sidebarClass(active, key) {
  return active === key ? "profile-side-link profile-side-link--active" : "profile-side-link";
}

export function ProfileLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  const path = location.pathname;
  const sidebarActive = path.startsWith("/profile/orders")
    ? "orders"
    : path.startsWith("/profile/settings")
      ? "settings"
      : path.startsWith("/profile/saved")
        ? "saved"
        : "profile";

  const isProfileHome = path === "/profile";
  const isOrdersRoute = path.startsWith("/profile/orders");
  const profileTabActive =
    !isOrdersRoute &&
    (path === "/profile" || path.startsWith("/profile/settings") || path.startsWith("/profile/saved"));

  const confirmLogout = () => {
    clearToken();
    navigate("/login", { replace: true });
  };

  useEffect(() => {
    if (!logoutConfirmOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") setLogoutConfirmOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [logoutConfirmOpen]);

  return (
    <div className="profile-page">
      <header className="shop-topnav-shell">
        <ShopTopNav searchPlaceholder="Search products..." />
      </header>

      <main className="profile-main">
        <aside className="profile-sidebar">
          <nav className="profile-side-card" aria-label="Account">
            <Link to="/profile" className={sidebarClass(sidebarActive, "profile")}>
              <span className="profile-side-icon" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
                  <path
                    d="M6 20v-1a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v1"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              My Profile
            </Link>
            <Link to="/profile/orders" className={sidebarClass(sidebarActive, "orders")}>
              <span className="profile-side-icon" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" stroke="currentColor" strokeWidth="2" />
                </svg>
              </span>
              Order History
            </Link>
            <Link to="/profile/settings" className={sidebarClass(sidebarActive, "settings")}>
              <span className="profile-side-icon" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992.004.085.004.17 0 .255-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.063-.374-.313-.686-.645-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 0 1 0-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              Settings
            </Link>
            <Link to="/profile/saved" className={sidebarClass(sidebarActive, "saved")}>
              <span className="profile-side-icon" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 2h12a2 2 0 0 1 2 2v18l-8-4.35L4 22V4a2 2 0 0 1 2-2Z" />
                </svg>
              </span>
              Saved Items
            </Link>
            <hr className="profile-side-rule" />
            <button type="button" className="profile-side-link profile-side-link--logout" onClick={() => setLogoutConfirmOpen(true)}>
              <span className="profile-side-icon" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              Logout
            </button>
          </nav>

          <div className="profile-insight-card">
            <div className="profile-insight-head">
              <span aria-hidden="true">✦</span>
              <span>Smart Insight</span>
            </div>
            <p>
              Based on your recent browsing, you might save $40 this month by using SmartCart&apos;s personalized
              deals.
            </p>
          </div>
        </aside>

        <section className="profile-content">{children}</section>
      </main>

      {logoutConfirmOpen ? (
        <div
          className="profile-logout-overlay"
          role="presentation"
          onClick={() => setLogoutConfirmOpen(false)}
        >
          <div
            className="profile-logout-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-logout-dialog-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="profile-logout-dialog-title" className="profile-logout-dialog-title">
              Log out?
            </h2>
            <p className="profile-logout-dialog-text">Are you sure you want to log out?</p>
            <div className="profile-logout-dialog-actions">
              <button type="button" className="profile-logout-btn-cancel" onClick={() => setLogoutConfirmOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="profile-logout-btn-confirm"
                onClick={() => {
                  setLogoutConfirmOpen(false);
                  confirmLogout();
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <nav className="profile-bottom-nav" aria-label="Mobile">
        <Link to="/home" className="profile-bottom-link">
          <span aria-hidden="true">⌂</span>
          Home
        </Link>
        <Link to="/catalog/products" className="profile-bottom-link">
          <span aria-hidden="true">▣</span>
          Shop
        </Link>
        <Link
          to="/profile/orders"
          className={`profile-bottom-link${isOrdersRoute ? " profile-bottom-link--active" : ""}`}
        >
          <span aria-hidden="true">☰</span>
          Orders
        </Link>
        <Link
          to="/profile"
          className={`profile-bottom-link${profileTabActive ? " profile-bottom-link--active" : ""}`}
        >
          <span aria-hidden="true">◉</span>
          Profile
        </Link>
      </nav>
    </div>
  );
}
