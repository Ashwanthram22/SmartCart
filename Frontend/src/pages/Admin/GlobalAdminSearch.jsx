import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  Activity as ActivityIcon,
  ArrowRight,
  Clock,
  LayoutGrid,
  Package,
  PieChart,
  Search,
  ShoppingCart,
} from "lucide-react";
import { adminListOrders, adminListProducts } from "../../api/client";
import { formatMoneyShort } from "../../utils/money";

/**
 * localStorage key for recent search picks. Stored per-browser, never
 * synced to the server — that's intentional: this is a productivity
 * convenience, not part of the user's audited activity.
 */
const RECENTS_STORAGE_KEY = "smartcart_admin_search_recents";
const MAX_RECENTS = 6;

function readRecents() {
  try {
    const raw = localStorage.getItem(RECENTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, MAX_RECENTS);
  } catch {
    return [];
  }
}

function writeRecents(list) {
  try {
    localStorage.setItem(
      RECENTS_STORAGE_KEY,
      JSON.stringify(list.slice(0, MAX_RECENTS))
    );
  } catch {
    /* localStorage can fail in private mode — silently ignore. */
  }
}

/**
 * Predefined navigation targets. We surface these whenever the query matches
 * a section name so admins can jump between pages from the search bar.
 */
const PAGE_TARGETS = [
  { id: "page-dashboard", label: "Dashboard", subtitle: "Real-time metrics and recent activity", to: "/admin", icon: LayoutGrid },
  { id: "page-inventory", label: "Inventory", subtitle: "Manage products, stock and pricing", to: "/admin/inventory", icon: Package },
  { id: "page-orders", label: "Orders", subtitle: "Review and update customer orders", to: "/admin/orders", icon: ShoppingCart },
  { id: "page-analytics", label: "Analytics", subtitle: "Revenue trends and category drill-downs", to: "/admin/analytics", icon: PieChart },
  { id: "page-activity", label: "Activity", subtitle: "Audit trail of every admin write", to: "/admin/activity", icon: ActivityIcon },
];

const STATUS_DOT = {
  processing: "var(--adm-accent)",
  transit: "#0ea5e9",
  delivered: "var(--adm-success)",
  cancelled: "var(--adm-danger)",
};

// Use the no-fraction shared formatter so search popover rows stay compact
// (e.g. `\u20b91,299` instead of `\u20b91,299.00`).
const formatMoney = formatMoneyShort;

function totalForOrder(order) {
  if (order?.totals?.grandTotal != null) return Number(order.totals.grandTotal);
  if (Array.isArray(order?.items)) {
    return order.items.reduce(
      (sum, it) => sum + Number(it.price || 0) * Number(it.quantity || 0),
      0
    );
  }
  return 0;
}

export default function GlobalAdminSearch({ placeholder = "Search orders, stock, or metrics..." }) {
  const navigate = useNavigate();
  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const menuRef = useRef(null);
  const listboxId = useId();
  const [value, setValue] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [menuPos, setMenuPos] = useState(null);
  const [recents, setRecents] = useState(() => readRecents());

  /**
   * Push a recent-selection record. We dedupe by `key` (so picking the same
   * product twice doesn't fill the list with duplicates) and cap to MAX so
   * the popover doesn't grow indefinitely. Persisted to localStorage so the
   * shortcut survives reload and tab swaps.
   */
  const pushRecent = useCallback((entry) => {
    if (!entry || !entry.key) return;
    setRecents((prev) => {
      const without = prev.filter((r) => r.key !== entry.key);
      const next = [{ ...entry, ts: Date.now() }, ...without].slice(0, MAX_RECENTS);
      writeRecents(next);
      return next;
    });
  }, []);

  const clearRecents = useCallback(() => {
    setRecents([]);
    writeRecents([]);
  }, []);

  /* ------- Debounce query into `debounced` ----------------------------- */
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value.trim()), 180);
    return () => clearTimeout(t);
  }, [value]);

  /* ------- Fetch products + orders for the debounced query ------------- */
  useEffect(() => {
    if (!open) return undefined;
    const q = debounced.trim();
    if (!q) {
      setProducts([]);
      setOrders([]);
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([
      adminListProducts({ q }).catch(() => ({ products: [] })),
      adminListOrders({ q }).catch(() => ({ orders: [] })),
    ])
      .then(([prodRes, orderRes]) => {
        if (cancelled) return;
        setProducts((prodRes.products || []).slice(0, 5));
        setOrders((orderRes.orders || []).slice(0, 5));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debounced, open]);

  /* ------- Pages (client-side filtered) -------------------------------- */
  const pageMatches = useMemo(() => {
    const q = debounced.trim().toLowerCase();
    if (!q) return [];
    return PAGE_TARGETS.filter(
      (p) =>
        p.label.toLowerCase().includes(q) ||
        p.subtitle.toLowerCase().includes(q)
    );
  }, [debounced]);

  /* ------- Build a flat list of selectable items for keyboard nav ------ */
  const items = useMemo(() => {
    const list = [];
    pageMatches.forEach((p) =>
      list.push({
        kind: "page",
        key: p.id,
        label: p.label,
        subtitle: p.subtitle,
        icon: p.icon,
        onSelect: () => {
          pushRecent({
            kind: "page",
            key: p.id,
            label: p.label,
            subtitle: p.subtitle,
            to: p.to,
          });
          navigate(p.to);
        },
      })
    );
    products.forEach((p) =>
      list.push({
        kind: "product",
        key: `prod-${p.id}`,
        label: p.title,
        subtitle: `${p.brand || "—"} • ${p.category || "—"} • ${formatMoney(p.price)} • ${Number(p.stock) || 0} in stock`,
        thumb: p.image || (Array.isArray(p.images) ? p.images[0] : null),
        onSelect: () => {
          pushRecent({
            kind: "product",
            key: `prod-${p.id}`,
            label: p.title,
            subtitle: `${p.brand || "—"} • ${p.category || "—"}`,
            thumb: p.image || (Array.isArray(p.images) ? p.images[0] : null),
            to: `/admin/inventory?q=${encodeURIComponent(String(p.title || p.id))}`,
          });
          const params = new URLSearchParams({ q: String(p.title || p.id) });
          navigate(`/admin/inventory?${params.toString()}`);
        },
      })
    );
    orders.forEach((o) => {
      const status = String(o.status || "processing").toLowerCase();
      list.push({
        kind: "order",
        key: `order-${o.id}`,
        label: o.id,
        subtitle: `${o.userEmail || o.userId || "Customer"} • ${formatMoney(totalForOrder(o))}`,
        statusLabel: status,
        statusColor: STATUS_DOT[status] || "var(--adm-muted)",
        onSelect: () => {
          pushRecent({
            kind: "order",
            key: `order-${o.id}`,
            label: o.id,
            subtitle: `${o.userEmail || o.userId || "Customer"}`,
            to: `/admin/orders?focus=${encodeURIComponent(String(o.id))}`,
          });
          const params = new URLSearchParams({ focus: String(o.id) });
          navigate(`/admin/orders?${params.toString()}`);
        },
      });
    });
    return list;
  }, [pageMatches, products, orders, navigate, pushRecent]);

  /* ------- Empty-state items (Recents + Quick links) ------------------- */
  const emptyStateItems = useMemo(() => {
    if (debounced.length > 0) return [];
    const list = [];
    recents.forEach((r) => {
      list.push({
        kind: r.kind || "recent",
        key: `recent-${r.key}`,
        label: r.label,
        subtitle: r.subtitle || "",
        thumb: r.thumb,
        recentEntry: r,
        onSelect: () => {
          if (r.to) navigate(r.to);
          pushRecent(r);
        },
      });
    });
    PAGE_TARGETS.forEach((p) =>
      list.push({
        kind: "page",
        key: `quick-${p.id}`,
        label: p.label,
        subtitle: p.subtitle,
        icon: p.icon,
        onSelect: () => {
          pushRecent({
            kind: "page",
            key: p.id,
            label: p.label,
            subtitle: p.subtitle,
            to: p.to,
          });
          navigate(p.to);
        },
      })
    );
    return list;
  }, [recents, debounced, navigate, pushRecent]);

  /* Combined list used by keyboard navigation. When the query is empty
   * we navigate over the empty-state list (recents + quick links); once
   * the user starts typing we switch to the live `items`. */
  const navItems = debounced.length > 0 ? items : emptyStateItems;

  /* ------- Reset selection when item list changes ---------------------- */
  useEffect(() => {
    setActiveIndex(0);
  }, [navItems.length, debounced]);

  /* ------- Anchor popover to input via getBoundingClientRect ----------- */
  const updatePosition = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setMenuPos({
      top: rect.bottom + 6,
      left: rect.left,
      minWidth: Math.max(rect.width, 380),
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return undefined;
    updatePosition();
    const onScroll = () => updatePosition();
    const onResize = () => updatePosition();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open, updatePosition]);

  /* ------- Close on outside click or Escape ---------------------------- */
  useEffect(() => {
    if (!open) return undefined;
    const onMouseDown = (e) => {
      if (
        wrapRef.current &&
        !wrapRef.current.contains(e.target) &&
        menuRef.current &&
        !menuRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  /* ------- Global shortcuts to focus the search input ------------------
   *
   * Two bindings, both surface the omnisearch:
   *
   *   - `/`         classic Vim-style focus (skipped when the user is
   *                 already typing in an input/textarea/contenteditable so
   *                 we don't hijack literal `/` keystrokes).
   *   - `Cmd/Ctrl-K`  Linear / Slack / GitHub omnibar convention. We
   *                 honour it everywhere, including inside inputs, so
   *                 admins can pop straight from the product form back
   *                 into the omnisearch.
   * -------------------------------------------------------------------*/
  useEffect(() => {
    const isEditableTarget = (e) => {
      const tag = (e.target?.tagName || "").toLowerCase();
      return (
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        e.target?.isContentEditable
      );
    };

    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
        setOpen(true);
        return;
      }
      if (e.key === "/" && !isEditableTarget(e) && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (navItems.length === 0) return;
      setActiveIndex((idx) => (idx + 1) % navItems.length);
      setOpen(true);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (navItems.length === 0) return;
      setActiveIndex((idx) => (idx - 1 + navItems.length) % navItems.length);
      setOpen(true);
    } else if (e.key === "Enter") {
      if (!open) return;
      e.preventDefault();
      const target = navItems[activeIndex];
      if (target) {
        target.onSelect();
        setOpen(false);
        setValue("");
      } else if (debounced) {
        // Fallback: route to inventory with current query
        const params = new URLSearchParams({ q: debounced });
        navigate(`/admin/inventory?${params.toString()}`);
        setOpen(false);
        setValue("");
      }
    }
  };

  const showMenu =
    open &&
    menuPos &&
    // Three cases:
    //  1. user is typing (debounced > 0) — show live results + loading state
    //  2. query is empty AND we have recents/quick-links to show
    //  3. otherwise hide the popover entirely (e.g. no query, no recents,
    //     but also no quick-links would still let it pass — keep this in
    //     case PAGE_TARGETS is ever empty)
    ((debounced.length > 0 && (loading || items.length > 0)) ||
      (debounced.length === 0 && emptyStateItems.length > 0));

  const menu = showMenu
    ? createPortal(
        <div
          ref={menuRef}
          id={listboxId}
          role="listbox"
          className="adm-globalsearch-menu"
          style={{
            position: "fixed",
            top: `${menuPos.top}px`,
            left: `${menuPos.left}px`,
            minWidth: `${menuPos.minWidth}px`,
          }}
        >
          {debounced.length === 0 ? (
            <EmptyState
              recents={recents}
              quickLinks={PAGE_TARGETS}
              navItems={navItems}
              activeIndex={activeIndex}
              setActiveIndex={setActiveIndex}
              onClearRecents={clearRecents}
              onPickRecent={(r) => {
                if (r.to) navigate(r.to);
                pushRecent(r);
                setOpen(false);
              }}
              onPickQuick={(p) => {
                pushRecent({
                  kind: "page",
                  key: p.id,
                  label: p.label,
                  subtitle: p.subtitle,
                  to: p.to,
                });
                navigate(p.to);
                setOpen(false);
              }}
            />
          ) : loading && items.length === 0 ? (
            <div className="adm-globalsearch-empty">Searching…</div>
          ) : items.length === 0 ? (
            <div className="adm-globalsearch-empty">
              No matches for <strong>“{debounced}”</strong>.
            </div>
          ) : (
            <>
              {pageMatches.length > 0 ? (
                <ResultGroup label="Jump to">
                  {pageMatches.map((p, idx) => (
                    <ResultRow
                      key={p.id}
                      active={items[activeIndex]?.key === p.id}
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={() => {
                        navigate(p.to);
                        setOpen(false);
                        setValue("");
                      }}
                    >
                      <span className="adm-globalsearch-icon" aria-hidden="true">
                        <p.icon size={15} />
                      </span>
                      <span className="adm-globalsearch-text">
                        <strong>{p.label}</strong>
                        <small>{p.subtitle}</small>
                      </span>
                      <ArrowRight size={14} aria-hidden="true" className="adm-globalsearch-arrow" />
                    </ResultRow>
                  ))}
                </ResultGroup>
              ) : null}

              {products.length > 0 ? (
                <ResultGroup label="Products">
                  {products.map((p) => {
                    const itemIdx = items.findIndex(
                      (it) => it.key === `prod-${p.id}`
                    );
                    return (
                      <ResultRow
                        key={p.id}
                        active={activeIndex === itemIdx}
                        onMouseEnter={() => setActiveIndex(itemIdx)}
                        onClick={() => {
                          items[itemIdx]?.onSelect();
                          setOpen(false);
                          setValue("");
                        }}
                      >
                        <span className="adm-globalsearch-thumb" aria-hidden="true">
                          {p.image ? (
                            <img src={p.image} alt="" />
                          ) : (
                            <Package size={14} />
                          )}
                        </span>
                        <span className="adm-globalsearch-text">
                          <strong>{p.title}</strong>
                          <small>
                            {(p.brand || "—") + " • " + (p.category || "—")} •{" "}
                            {formatMoney(p.price)} • {Number(p.stock) || 0} in stock
                          </small>
                        </span>
                        <ArrowRight size={14} aria-hidden="true" className="adm-globalsearch-arrow" />
                      </ResultRow>
                    );
                  })}
                </ResultGroup>
              ) : null}

              {orders.length > 0 ? (
                <ResultGroup label="Orders">
                  {orders.map((o) => {
                    const status = String(o.status || "processing").toLowerCase();
                    const itemIdx = items.findIndex(
                      (it) => it.key === `order-${o.id}`
                    );
                    return (
                      <ResultRow
                        key={o.id}
                        active={activeIndex === itemIdx}
                        onMouseEnter={() => setActiveIndex(itemIdx)}
                        onClick={() => {
                          items[itemIdx]?.onSelect();
                          setOpen(false);
                          setValue("");
                        }}
                      >
                        <span
                          className="adm-globalsearch-status"
                          aria-hidden="true"
                          style={{ background: STATUS_DOT[status] || "var(--adm-muted)" }}
                        />
                        <span className="adm-globalsearch-text">
                          <strong>{o.id}</strong>
                          <small>
                            {(o.userEmail || o.userId || "Customer") + " • "}
                            {formatMoney(totalForOrder(o))} • {status}
                          </small>
                        </span>
                        <ArrowRight size={14} aria-hidden="true" className="adm-globalsearch-arrow" />
                      </ResultRow>
                    );
                  })}
                </ResultGroup>
              ) : null}
            </>
          )}

          <footer className="adm-globalsearch-foot">
            <kbd>↑</kbd>
            <kbd>↓</kbd> navigate
            <kbd>↵</kbd> open
            <kbd>Esc</kbd> close
            <span className="adm-globalsearch-foot-spacer" aria-hidden="true" />
            <kbd>⌘/Ctrl</kbd>
            <kbd>K</kbd> anywhere
          </footer>
        </div>,
        document.body
      )
    : null;

  return (
    <div ref={wrapRef} className="adm-search adm-globalsearch">
      <Search size={16} aria-hidden="true" />
      <input
        ref={inputRef}
        type="search"
        role="combobox"
        aria-expanded={showMenu ? true : false}
        aria-controls={listboxId}
        aria-autocomplete="list"
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
      />
      {menu}
    </div>
  );
}

/**
 * "What can I do from here?" popover shown when the search bar is focused
 * but empty. Combines two groups:
 *   - Recent: the admin's last `MAX_RECENTS` picks across products, orders
 *     and pages (with a Clear button to wipe the list)
 *   - Quick links: every PAGE_TARGET, so the bar doubles as a kebab menu
 *     for jumping between admin pages without typing
 */
function EmptyState({
  recents,
  quickLinks,
  navItems,
  activeIndex,
  setActiveIndex,
  onClearRecents,
  onPickRecent,
  onPickQuick,
}) {
  return (
    <>
      {recents.length > 0 ? (
        <ResultGroup
          label="Recent"
          action={
            <button
              type="button"
              className="adm-globalsearch-clear-recents"
              onClick={onClearRecents}
              onMouseDown={(e) => e.preventDefault()}
            >
              Clear
            </button>
          }
        >
          {recents.map((r) => {
            const itemIdx = navItems.findIndex(
              (it) => it.key === `recent-${r.key}`
            );
            return (
              <ResultRow
                key={`recent-${r.key}`}
                active={activeIndex === itemIdx}
                onMouseEnter={() => setActiveIndex(itemIdx)}
                onClick={() => onPickRecent(r)}
              >
                <span className="adm-globalsearch-icon" aria-hidden="true">
                  {r.thumb ? (
                    <img
                      src={r.thumb}
                      alt=""
                      style={{ width: 18, height: 18, borderRadius: 4 }}
                    />
                  ) : (
                    <Clock size={15} />
                  )}
                </span>
                <span className="adm-globalsearch-text">
                  <strong>{r.label}</strong>
                  {r.subtitle ? <small>{r.subtitle}</small> : null}
                </span>
                <ArrowRight
                  size={14}
                  aria-hidden="true"
                  className="adm-globalsearch-arrow"
                />
              </ResultRow>
            );
          })}
        </ResultGroup>
      ) : null}

      <ResultGroup label={recents.length > 0 ? "Quick links" : "Jump to"}>
        {quickLinks.map((p) => {
          const itemIdx = navItems.findIndex(
            (it) => it.key === `quick-${p.id}`
          );
          return (
            <ResultRow
              key={p.id}
              active={activeIndex === itemIdx}
              onMouseEnter={() => setActiveIndex(itemIdx)}
              onClick={() => onPickQuick(p)}
            >
              <span className="adm-globalsearch-icon" aria-hidden="true">
                <p.icon size={15} />
              </span>
              <span className="adm-globalsearch-text">
                <strong>{p.label}</strong>
                <small>{p.subtitle}</small>
              </span>
              <ArrowRight
                size={14}
                aria-hidden="true"
                className="adm-globalsearch-arrow"
              />
            </ResultRow>
          );
        })}
      </ResultGroup>
    </>
  );
}

function ResultGroup({ label, action, children }) {
  return (
    <div className="adm-globalsearch-group">
      <div className="adm-globalsearch-group-label">
        <span>{label}</span>
        {action}
      </div>
      <ul className="adm-globalsearch-list">{children}</ul>
    </div>
  );
}

function ResultRow({ active, onMouseEnter, onClick, children }) {
  return (
    <li
      role="option"
      aria-selected={active}
      className={
        "adm-globalsearch-row" + (active ? " adm-globalsearch-row--active" : "")
      }
      onMouseEnter={onMouseEnter}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {children}
    </li>
  );
}
