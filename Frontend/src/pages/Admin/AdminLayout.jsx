import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  Activity as ActivityIcon,
  AlertTriangle,
  Bell,
  BookOpen,
  ChevronRight,
  HelpCircle,
  Keyboard,
  LayoutGrid,
  LogOut,
  Package,
  PackageX,
  PieChart,
  Plus,
  Settings as SettingsIcon,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { clearToken, getTokenClaims } from "../../utils/authToken";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import { adminGetStats, adminListProducts } from "../../api/client";
import { ShopThemeToggle } from "../../components/ShopThemeToggle";
import GlobalAdminSearch from "./GlobalAdminSearch";
import { AdminAlertsListSkeleton } from "./AdminSkeletons";
import "../../components/ShopThemeToggle.css";
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
  { match: /^\/admin\/activity/, label: "Activity" },
  { match: /^\/admin\/customer-alerts/, label: "Customer alerts" },
  { match: /^\/admin/, label: "Dashboard" },
];

const NAV_ITEMS = [
  { to: "/admin", label: "Dashboard", icon: LayoutGrid, end: true },
  { to: "/admin/inventory", label: "Inventory", icon: Package, end: false },
  { to: "/admin/orders", label: "Orders", icon: ShoppingCart, end: false },
  { to: "/admin/analytics", label: "Analytics", icon: PieChart, end: false },
  { to: "/admin/activity", label: "Activity", icon: ActivityIcon, end: false },
  { to: "/admin/customer-alerts", label: "Customer alerts", icon: Bell, end: false },
];

function pageLabelForPath(pathname) {
  for (const entry of ROUTE_LABELS) {
    if (entry.match.test(pathname)) return entry.label;
  }
  return "Admin Console";
}

/** Contextual trail under the page title (URL + query driven). */
function AdminBreadcrumbs() {
  const { pathname } = useLocation();
  const [params] = useSearchParams();

  const items = useMemo(() => {
    if (pathname === "/admin" || pathname === "/admin/") {
      return [
        { label: "Admin", to: "/admin" },
        { label: "Dashboard" },
      ];
    }
    const crumbs = [{ label: "Admin", to: "/admin" }];
    if (pathname.startsWith("/admin/inventory")) {
      crumbs.push({ label: "Inventory", to: "/admin/inventory" });
      const q = (params.get("q") || "").trim();
      if (q) crumbs.push({ label: `Search “${q}”` });
      return crumbs;
    }
    if (pathname.startsWith("/admin/orders")) {
      crumbs.push({ label: "Orders", to: "/admin/orders" });
      return crumbs;
    }
    if (pathname.startsWith("/admin/analytics")) {
      crumbs.push({ label: "Analytics", to: "/admin/analytics" });
      return crumbs;
    }
    if (pathname.startsWith("/admin/activity")) {
      crumbs.push({ label: "Activity", to: "/admin/activity" });
      const parts = [];
      const q = (params.get("q") || "").trim();
      const act = (params.get("action") || "").trim();
      if (act) parts.push(`Action: ${act}`);
      if (q) parts.push(`Search: ${q}`);
      if (parts.length) crumbs.push({ label: parts.join(" · ") });
      return crumbs;
    }
    if (pathname.startsWith("/admin/customer-alerts")) {
      crumbs.push({ label: "Customer alerts", to: "/admin/customer-alerts" });
      return crumbs;
    }
    return crumbs;
  }, [pathname, params]);

  if (items.length <= 1) return null;

  return (
    <nav className="adm-page-breadcrumbs" aria-label="Breadcrumb">
      <ol className="adm-page-breadcrumbs-list">
        {items.map((cr, i) => (
          <li key={`${i}-${cr.label}`}>
            {i > 0 ? (
              <span className="adm-page-bc-sep" aria-hidden="true">
                <ChevronRight size={14} strokeWidth={2.25} />
              </span>
            ) : null}
            {i < items.length - 1 && cr.to ? (
              <Link to={cr.to}>{cr.label}</Link>
            ) : (
              <span
                className="adm-page-bc-current"
                aria-current={i === items.length - 1 ? "page" : undefined}
              >
                {cr.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/* ============================================================================
 * AdminShortcutsModal — keyboard reference for power users.
 * ==========================================================================*/

function AdminShortcutsModal({ open, onClose }) {
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

  return (
    <div className="adm-settings-overlay" role="presentation" onClick={onClose}>
      <div
        ref={ref}
        className="adm-shortcuts-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="adm-shortcuts-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="adm-shortcuts-head">
          <div>
            <h2 id="adm-shortcuts-title">Keyboard shortcuts</h2>
            <p>Works anywhere in the admin console unless focus is inside a text field.</p>
          </div>
          <button
            type="button"
            className="adm-settings-close"
            onClick={onClose}
            aria-label="Close shortcuts"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        <div className="adm-shortcuts-body">
          <ul className="adm-shortcuts-list">
            <li>
              <span>Close modals, menus and the order drawer</span>
              <span>
                <kbd>Esc</kbd>
              </span>
            </li>
            <li>
              <span>Focus global search</span>
              <span>
                <kbd>Cmd</kbd>/<kbd>Ctrl</kbd>+<kbd>K</kbd> or <kbd>/</kbd>
              </span>
            </li>
            <li>
              <span>Inventory — add product (when inventory is focused)</span>
              <span>
                <kbd>N</kbd>
              </span>
            </li>
            <li>
              <span>Navigate sections</span>
              <span>
                <kbd>Tab</kbd> / <kbd>Shift</kbd>+<kbd>Tab</kbd>
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
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

  const openProductInInventory = (product, stockKind) => {
    if (!product?.id) return;
    onClose();
    const params = new URLSearchParams();
    params.set("q", product.id);
    if (stockKind === "low" || stockKind === "out") {
      params.set("chip", stockKind);
    }
    navigate(`/admin/inventory?${params.toString()}`);
  };

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
                ? "Checking stock levels…"
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
            <AdminAlertsListSkeleton rows={5} />
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
                        <button
                          type="button"
                          className="adm-alerts-thumb adm-alerts-thumb-btn"
                          onClick={() => openProductInInventory(p, "out")}
                          aria-label={`View ${p.title} in inventory`}
                        >
                          {p.image ? <img src={p.image} alt="" /> : "—"}
                        </button>
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
                        <button
                          type="button"
                          className="adm-alerts-thumb adm-alerts-thumb-btn"
                          onClick={() => openProductInInventory(p, "low")}
                          aria-label={`View ${p.title} in inventory`}
                        >
                          {p.image ? <img src={p.image} alt="" /> : "—"}
                        </button>
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
 * AboutAdminModal — opened by the topbar "?" icon. Gives a new admin a
 * quick tour of what SmartCart AI is, what each console area is for, and
 * what their role boils down to in one screen.
 * ==========================================================================*/

function AboutAdminModal({ open, onClose }) {
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

  return (
    <div className="adm-about-overlay" role="presentation" onClick={onClose}>
      <div
        ref={ref}
        className="adm-about-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="adm-about-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="adm-about-head">
          <div className="adm-about-head-text">
            <span className="adm-about-eyebrow" aria-hidden="true">
              <BookOpen size={13} />
              SmartCart AI Console
            </span>
            <h2 id="adm-about-title">Welcome to the admin console</h2>
            <p>
              The control room behind the SmartCart AI storefront — manage
              products, orders, and growth from one place.
            </p>
          </div>
          <button
            type="button"
            className="adm-settings-close"
            onClick={onClose}
            aria-label="Close about"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <section className="adm-about-body">
          <div className="adm-about-callout">
            <span className="adm-about-callout-icon" aria-hidden="true">
              <ShieldCheck size={18} />
            </span>
            <div>
              <strong>Your role: System Administrator</strong>
              <p>
                You're the only role that can add, edit or remove catalog
                products, change order statuses, and view sensitive sales
                analytics. Regular customers never see this console.
              </p>
            </div>
          </div>

          <div className="adm-about-grid">
            <article className="adm-about-card">
              <span className="adm-about-card-icon" aria-hidden="true">
                <LayoutGrid size={16} />
              </span>
              <strong>Dashboard</strong>
              <p>
                Real-time revenue, orders, AOV and low-stock counts with
                period comparisons and a sales sparkline.
              </p>
            </article>

            <article className="adm-about-card">
              <span className="adm-about-card-icon" aria-hidden="true">
                <Package size={16} />
              </span>
              <strong>Inventory</strong>
              <p>
                Create, edit, duplicate and delete products. Upload images
                straight to Cloudinary, manage stock, and bulk-export to CSV.
              </p>
            </article>

            <article className="adm-about-card">
              <span className="adm-about-card-icon" aria-hidden="true">
                <ShoppingCart size={16} />
              </span>
              <strong>Orders</strong>
              <p>
                Track every customer order, drill into line items, update
                fulfilment status individually or in bulk, and print invoices.
              </p>
            </article>

            <article className="adm-about-card">
              <span className="adm-about-card-icon" aria-hidden="true">
                <PieChart size={16} />
              </span>
              <strong>Analytics</strong>
              <p>
                Revenue trends, inventory health, top categories and best
                sellers — click a category to drill into matching products.
              </p>
            </article>

            <article className="adm-about-card">
              <span className="adm-about-card-icon" aria-hidden="true">
                <ActivityIcon size={16} />
              </span>
              <strong>Activity</strong>
              <p>
                Audit trail of every product change, order status update and
                bulk action — see who did what, when, with a before/after diff.
              </p>
            </article>
          </div>

          <div className="adm-about-tips">
            <span className="adm-about-tips-icon" aria-hidden="true">
              <Sparkles size={14} />
            </span>
            <div>
              <strong>Pro tips</strong>
              <ul>
                <li>
                  Use the topbar search to jump to any product, order or page
                  instantly.
                </li>
                <li>
                  Press <kbd>/</kbd> from anywhere to focus the global search,
                  or <kbd>n</kbd> on Inventory to add a new product.
                </li>
                <li>
                  The bell icon lights up when products run low — open it for
                  a one-click jump to inventory.
                </li>
              </ul>
            </div>
          </div>
        </section>

        <footer className="adm-about-foot">
          <button type="button" className="adm-btn-primary" onClick={onClose}>
            Got it
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
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const claims = getTokenClaims();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [alertCount, setAlertCount] = useState(null);
  const bellRef = useRef(null);

  const resolvedTitle = title || pageLabelForPath(location.pathname);

  /**
   * Pull the lightweight stats payload so the bell can show how many
   * products need attention without forcing the full alerts modal open.
   * If the call fails we silently leave the badge off — the modal can still
   * be opened manually.
   *
   * Wrapped in `useCallback` so it can be reused as both the initial fetch
   * and the listener for the `admin:inventory-changed` event below. Each
   * call uses its own AbortController so a quick burst of mutations only
   * leaves the latest result applied.
   */
  const refreshAlertCount = useCallback(async () => {
    try {
      const data = await adminGetStats();
      const totals = data.totals || {};
      setAlertCount(
        (Number(totals.lowStock) || 0) + (Number(totals.outOfStock) || 0)
      );
    } catch {
      setAlertCount(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    // Initial load — fire immediately so the badge appears as soon as the
    // layout mounts, not after the first inventory mutation.
    (async () => {
      if (!cancelled) await refreshAlertCount();
    })();

    /*
     * Live refresh: API client emits `admin:inventory-changed` after every
     * create / update / delete / bulk-import call. We refetch the stats so
     * the bell badge reflects the new low/out-of-stock totals without the
     * user having to navigate away and back. Stays mounted for the whole
     * admin session so events from any page are picked up.
     */
    const onChanged = () => {
      if (!cancelled) refreshAlertCount();
    };
    window.addEventListener("admin:inventory-changed", onChanged);

    return () => {
      cancelled = true;
      window.removeEventListener("admin:inventory-changed", onChanged);
    };
  }, [refreshAlertCount]);

  const handleLogout = () => {
    clearToken();
    navigate("/login", { replace: true });
  };

  const closeAlerts = useCallback(() => {
    setAlertsOpen(false);
    refreshAlertCount();
    queueMicrotask(() => bellRef.current?.focus?.());
  }, [refreshAlertCount]);

  return (
    <div className="adm-shell">
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
          <div className="adm-userpill" title={claims?.email || undefined}>
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
            <GlobalAdminSearch placeholder={searchPlaceholder} />
          </div>
          <div className="adm-topbar-right">
            <ShopThemeToggle classPrefix="adm" />
            <button
              type="button"
              ref={bellRef}
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
              aria-label="Keyboard shortcuts"
              title="Keyboard shortcuts"
              onClick={() => setShortcutsOpen(true)}
            >
              <Keyboard size={18} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="adm-icon-btn"
              aria-label="About SmartCart admin console"
              title="About the admin console"
              onClick={() => setAboutOpen(true)}
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
              <AdminBreadcrumbs />
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
        onClose={closeAlerts}
      />

      <AboutAdminModal open={aboutOpen} onClose={() => setAboutOpen(false)} />

      <AdminShortcutsModal
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
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
