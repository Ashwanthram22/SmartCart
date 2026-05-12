import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Bell,
  HelpCircle,
  LayoutGrid,
  LogOut,
  Package,
  PackageX,
  PieChart,
  Plus,
  Search,
  Settings as SettingsIcon,
  ShoppingCart,
  UserRound,
  X,
} from "lucide-react";
import { clearToken, getTokenClaims } from "../../utils/authToken";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import { adminGetStats, adminListProducts } from "../../api/client";
import "./AdminLayout.css";

/**
 * Page title resolved from the active route, used in the top bar.
 * Sub-pages inside an admin section can also override this by passing
 * their own `title` prop.
 */
const ROUTE_LABELS = [
  { match: /^\/admin\/inventory/, label: "Inventory" },
  { match: /^\/admin\/orders/, label: "Orders" },
  { match: /^\/admin\/analytics/, label: "Analytics" },
  { match: /^\/admin/, label: "Dashboard" },
];

const NAV_ITEMS = [
  { to: "/admin", label: "Dashboard", icon: LayoutGrid, end: true },
  { to: "/admin/inventory", label: "Inventory", icon: Package, end: false },
  { to: "/admin/orders", label: "Orders", icon: ShoppingCart, end: false },
  { to: "/admin/analytics", label: "Analytics", icon: PieChart, end: false },
];

function pageLabelForPath(pathname) {
  for (const entry of ROUTE_LABELS) {
    if (entry.match.test(pathname)) return entry.label;
  }
  return "Admin Console";
}

/* ============================================================================
 * LogoutDialog — confirmation triggered from the Settings modal.
 * ==========================================================================*/

function LogoutDialog({ open, onCancel, onConfirm }) {
  const ref = useRef(null);
  useFocusTrap(ref, open);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;
  return (
    <div className="adm-logout-overlay" role="presentation" onClick={onCancel}>
      <div
        ref={ref}
        className="adm-logout-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="adm-logout-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="adm-logout-title">Would you like to log out?</h2>
        <p>You'll be returned to the public storefront login screen.</p>
        <div className="adm-logout-actions">
          <button type="button" className="adm-btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="adm-btn-danger" onClick={onConfirm}>
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
 * SettingsModal — opened by the topbar settings cog. Shows the signed-in
 * admin and a sign-out button that hands off to LogoutDialog.
 * ==========================================================================*/

function SettingsModal({ open, claims, onClose, onSignOut }) {
  const ref = useRef(null);
  useFocusTrap(ref, open);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const email = claims?.email || "Admin";
  const username = email.split("@")[0] || "Admin";

  return (
    <div className="adm-settings-overlay" role="presentation" onClick={onClose}>
      <div
        ref={ref}
        className="adm-settings-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="adm-settings-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="adm-settings-head">
          <div>
            <h2 id="adm-settings-title">Settings</h2>
            <p>Manage your admin session.</p>
          </div>
          <button
            type="button"
            className="adm-settings-close"
            onClick={onClose}
            aria-label="Close settings"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <section className="adm-settings-body">
          <div className="adm-settings-userpill">
            <span className="adm-userpill-avatar" aria-hidden="true">
              <UserRound size={22} />
            </span>
            <span className="adm-settings-userpill-text">
              <strong>{username}</strong>
              <small>{email}</small>
              <em>System Administrator</em>
            </span>
          </div>

          <button
            type="button"
            className="adm-settings-row adm-settings-row--danger"
            onClick={onSignOut}
          >
            <LogOut size={16} aria-hidden="true" />
            <span>
              <strong>Sign out</strong>
              <small>Return to the storefront login screen</small>
            </span>
          </button>
        </section>
      </div>
    </div>
  );
}

/* ============================================================================
 * InventoryAlertsModal — opened by the bell icon. Lists out-of-stock and
 * low-stock products with quick links into the inventory page.
 * ==========================================================================*/

function InventoryAlertsModal({ open, onClose }) {
  const ref = useRef(null);
  useFocusTrap(ref, open);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState({ out: [], low: [] });
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Fetch the live product list every time the modal opens so admins see
  // the latest stock counts after any restocks or sales since the last view.
  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const data = await adminListProducts();
        if (cancelled) return;
        const products = data.products || [];
        const out = products.filter((p) => Number(p.stock) === 0);
        const low = products
          .filter((p) => Number(p.stock) > 0 && Number(p.stock) <= 10)
          .sort((a, b) => Number(a.stock) - Number(b.stock));
        setAlerts({ out, low });
      } catch (err) {
        if (cancelled) return;
        setError(err.response?.data?.message || "Couldn't load alerts.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!open) return null;

  const total = alerts.out.length + alerts.low.length;

  return (
    <div className="adm-alerts-overlay" role="presentation" onClick={onClose}>
      <div
        ref={ref}
        className="adm-alerts-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="adm-alerts-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="adm-alerts-head">
          <div>
            <h2 id="adm-alerts-title">
              <Bell size={18} aria-hidden="true" />
              Inventory Alerts
            </h2>
            <p>
              {loading
                ? "Loading the latest stock levels…"
                : total === 0
                ? "Everything is well stocked."
                : `${total} product${total === 1 ? "" : "s"} need attention.`}
            </p>
          </div>
          <button
            type="button"
            className="adm-settings-close"
            onClick={onClose}
            aria-label="Close inventory alerts"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <section className="adm-alerts-body">
          {error ? (
            <p className="adm-alerts-error" role="alert">
              {error}
            </p>
          ) : null}

          {loading ? (
            <p className="adm-alerts-empty">Fetching alerts…</p>
          ) : total === 0 ? (
            <p className="adm-alerts-empty">
              All products have healthy stock levels. Nothing to do right now.
            </p>
          ) : (
            <div className="adm-alerts-groups">
              {alerts.out.length > 0 ? (
                <div className="adm-alerts-group">
                  <h3 className="adm-alerts-group-title">
                    <PackageX size={14} aria-hidden="true" />
                    Out of stock
                    <span className="adm-alerts-count">{alerts.out.length}</span>
                  </h3>
                  <ul className="adm-alerts-list">
                    {alerts.out.map((p) => (
                      <li key={p.id} className="adm-alerts-item">
                        <span className="adm-alerts-thumb" aria-hidden="true">
                          {p.image ? <img src={p.image} alt="" /> : "—"}
                        </span>
                        <span className="adm-alerts-info">
                          <strong>{p.title}</strong>
                          <small>{p.brand || "—"} • {p.category || "—"}</small>
                        </span>
                        <span className="adm-alerts-tag adm-alerts-tag--out">
                          0 left
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {alerts.low.length > 0 ? (
                <div className="adm-alerts-group">
                  <h3 className="adm-alerts-group-title">
                    <AlertTriangle size={14} aria-hidden="true" />
                    Running low
                    <span className="adm-alerts-count">{alerts.low.length}</span>
                  </h3>
                  <ul className="adm-alerts-list">
                    {alerts.low.map((p) => (
                      <li key={p.id} className="adm-alerts-item">
                        <span className="adm-alerts-thumb" aria-hidden="true">
                          {p.image ? <img src={p.image} alt="" /> : "—"}
                        </span>
                        <span className="adm-alerts-info">
                          <strong>{p.title}</strong>
                          <small>{p.brand || "—"} • {p.category || "—"}</small>
                        </span>
                        <span className="adm-alerts-tag adm-alerts-tag--low">
                          {p.stock} left
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          )}
        </section>

        <footer className="adm-alerts-foot">
          <button
            type="button"
            className="adm-btn-ghost"
            onClick={onClose}
          >
            Dismiss
          </button>
          <button
            type="button"
            className="adm-btn-primary"
            onClick={() => {
              onClose();
              navigate("/admin/inventory");
            }}
            disabled={loading || total === 0}
          >
            Open inventory
          </button>
        </footer>
      </div>
    </div>
  );
}

/* ============================================================================
 * AdminLayout
 * ==========================================================================*/

export default function AdminLayout({
  children,
  title,
  subtitle,
  actions,
  onAddProduct,
  searchPlaceholder = "Search orders, stock, or metrics...",
  searchValue,
  onSearchChange,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const claims = getTokenClaims();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [alertCount, setAlertCount] = useState(null);

  const resolvedTitle = title || pageLabelForPath(location.pathname);

  // Pull the lightweight stats payload once so the bell can show how many
  // products need attention without forcing the full alerts modal open.
  // If the call fails we silently leave the badge off — the modal can still
  // be opened manually.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await adminGetStats();
        if (cancelled) return;
        const totals = data.totals || {};
        setAlertCount(
          (Number(totals.lowStock) || 0) + (Number(totals.outOfStock) || 0)
        );
      } catch {
        if (!cancelled) setAlertCount(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = () => {
    clearToken();
    navigate("/login", { replace: true });
  };

  return (
    <div className="adm-shell">
      <a href="#admin-main" className="skip-link">
        Skip to admin content
      </a>

      <aside className="adm-sidebar" aria-label="Admin navigation">
        <Link to="/admin" className="adm-brand">
          <span className="adm-brand-mark" aria-hidden="true">SC</span>
          <span className="adm-brand-text">
            <strong>SmartCart AI</strong>
            <small>Enterprise Console</small>
          </span>
        </Link>

        <nav className="adm-nav" aria-label="Sections">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                "adm-nav-link" + (isActive ? " adm-nav-link--active" : "")
              }
            >
              <Icon size={18} aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="adm-sidebar-foot">
          <div className="adm-userpill">
            <span className="adm-userpill-avatar" aria-hidden="true">
              <UserRound size={20} />
            </span>
            <span className="adm-userpill-text">
              <strong>{claims?.email?.split("@")[0] || "Admin"}</strong>
              <small>System Administrator</small>
            </span>
          </div>
        </div>
      </aside>

      <div className="adm-main-wrap">
        <header className="adm-topbar">
          <div className="adm-topbar-left">
            <h1 className="adm-topbar-title">Admin Console</h1>
            {onSearchChange ? (
              <label className="adm-search">
                <Search size={16} aria-hidden="true" />
                <input
                  type="search"
                  placeholder={searchPlaceholder}
                  value={searchValue || ""}
                  onChange={(e) => onSearchChange(e.target.value)}
                  aria-label="Search the admin console"
                />
              </label>
            ) : (
              <div className="adm-search adm-search--static" aria-hidden="true">
                <Search size={16} />
                <span>{searchPlaceholder}</span>
              </div>
            )}
          </div>
          <div className="adm-topbar-right">
            <button
              type="button"
              className="adm-icon-btn adm-icon-btn--badge"
              aria-label={
                alertCount
                  ? `Notifications (${alertCount} inventory alert${alertCount === 1 ? "" : "s"})`
                  : "Notifications"
              }
              title="Inventory alerts"
              onClick={() => setAlertsOpen(true)}
            >
              <Bell size={18} aria-hidden="true" />
              {alertCount != null && alertCount > 0 ? (
                <span className="adm-icon-badge" aria-hidden="true">
                  {alertCount > 9 ? "9+" : alertCount}
                </span>
              ) : null}
            </button>
            <button
              type="button"
              className="adm-icon-btn"
              aria-label="Help"
              title="Help"
            >
              <HelpCircle size={18} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="adm-icon-btn"
              aria-label="Settings"
              title="Settings"
              onClick={() => setSettingsOpen(true)}
            >
              <SettingsIcon size={18} aria-hidden="true" />
            </button>
          </div>
        </header>

        <main id="admin-main" className="adm-main">
          <div className="adm-page-head">
            <div>
              <h2 className="adm-page-title">{resolvedTitle}</h2>
              {subtitle ? <p className="adm-page-subtitle">{subtitle}</p> : null}
            </div>
            {actions ? <div className="adm-page-actions">{actions}</div> : null}
          </div>
          <div className="adm-page-body">{children}</div>
        </main>

        {onAddProduct ? (
          <button
            type="button"
            className="adm-fab"
            onClick={onAddProduct}
            aria-label="Add product"
            title="Add product"
          >
            <Plus size={22} aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <SettingsModal
        open={settingsOpen}
        claims={claims}
        onClose={() => setSettingsOpen(false)}
        onSignOut={() => {
          setSettingsOpen(false);
          setLogoutOpen(true);
        }}
      />

      <InventoryAlertsModal
        open={alertsOpen}
        onClose={() => setAlertsOpen(false)}
      />

      <LogoutDialog
        open={logoutOpen}
        onCancel={() => setLogoutOpen(false)}
        onConfirm={() => {
          setLogoutOpen(false);
          handleLogout();
        }}
      />
    </div>
  );
}
