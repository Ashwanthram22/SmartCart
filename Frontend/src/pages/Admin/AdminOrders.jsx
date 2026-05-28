import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDashed,
  Download,
  Filter,
  Inbox,
  PackageCheck,
  Search,
  Truck,
  X,
  XCircle,
} from "lucide-react";
import AdminLayout from "./AdminLayout";
import AdmDropdown from "../../components/AdmDropdown";
import {
  adminBulkUpdateOrderStatus,
  adminListOrders,
  adminUpdateOrderStatus,
} from "../../api/client";
import { downloadOrdersPdf } from "../../utils/pdfExports";
import { useToast } from "../../hooks/useToast";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import usePageMeta from "../../hooks/usePageMeta";
import { formatMoney } from "../../utils/money";
import "./AdminOrders.css";

const STATUSES = [
  { value: "", label: "All statuses" },
  { value: "processing", label: "Processing" },
  { value: "transit", label: "In transit" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

const STATUS_META = {
  processing: { label: "Processing", icon: CircleDashed, tone: "info" },
  transit: { label: "In transit", icon: Truck, tone: "warn" },
  delivered: { label: "Delivered", icon: PackageCheck, tone: "ok" },
  cancelled: { label: "Cancelled", icon: XCircle, tone: "danger" },
};

/** API stores subtotal/discount/tax/total on the order root; legacy rows may use `totals`. */
function orderAmounts(order) {
  const nested = order?.totals || {};
  const items = Array.isArray(order?.items) ? order.items : [];
  const fromLines = items.reduce((sum, it) => {
    if (it.lineTotal != null) return sum + Number(it.lineTotal);
    const qty = Number(it.quantity || 1);
    const price = Number(it.unitPrice ?? it.priceAtPurchase ?? it.price ?? 0);
    return sum + price * qty;
  }, 0);
  return {
    subtotal: Number(order?.subtotal ?? nested.subtotal ?? fromLines),
    discount: Number(order?.discount ?? nested.discount ?? 0),
    tax: Number(order?.tax ?? nested.tax ?? 0),
    shipping: Number(nested.shipping ?? 0),
    total: Number(order?.total ?? nested.total ?? nested.grandTotal ?? fromLines),
  };
}

const DATE_RANGES = [
  { value: "all", label: "All time" },
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
];

const PAGE_SIZE_OPTIONS = [
  { value: "10", label: "10 / page" },
  { value: "25", label: "25 / page" },
  { value: "50", label: "50 / page" },
];

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || { label: status, icon: CircleDashed, tone: "muted" };
  const Icon = meta.icon;
  return (
    <span className={`ao-badge ao-badge--${meta.tone}`}>
      <Icon size={12} aria-hidden="true" />
      {meta.label}
    </span>
  );
}

function formatDate(iso) {
  const ts = Date.parse(iso);
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateLong(iso) {
  const ts = Date.parse(iso);
  if (!ts) return "—";
  return new Date(ts).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function summariseItems(items) {
  if (!Array.isArray(items) || items.length === 0) return "—";
  const first = items[0]?.title || "Item";
  const more = items.length - 1;
  return more > 0 ? `${first} +${more} more` : first;
}

/**
 * Lazy-load and memoise pdfmake. The bundle is ~1 MB (font subsets +
 * core), so we deliberately keep it out of the initial JS chunk and only
 * fetch it the first time an admin downloads an invoice. The promise is
 * cached so subsequent clicks are instant.
 *
 * Font registration story:
 *   pdfmake 0.3.x ships `vfs_fonts.js` as a CJS file that ends with:
 *
 *     if (typeof module !== 'undefined') { module.exports = vfs; }
 *
 *   When Vite/rolldown bundles that as ESM the conditional `module.exports`
 *   sometimes survives as a default export, sometimes doesn't, and on a few
 *   interop paths the namespace ends up exposing the font keys but with
 *   `undefined` values — which is what was happening here (pdfmake's
 *   `for...in` loop was iterating keys and then calling
 *   `Buffer.from(undefined)` for the value, producing the cryptic
 *   "Received type undefined" crash).
 *
 *   To avoid every one of those bundler quirks we side-step the import
 *   entirely: load `vfs_fonts.js` as raw text via Vite's `?raw` query
 *   and evaluate it in a sandbox we control. The file just defines a
 *   `vfs` constant and assigns it to `module.exports`, so we capture
 *   that and feed it straight to `pdfMake.addVirtualFileSystem`. After
 *   registration we verify that at least one font is now resolvable —
 *   if not we throw a clear error rather than letting pdfmake fail
 *   downstream with the original cryptic message.
 */
let pdfMakePromise = null;
function loadPdfMake() {
  if (pdfMakePromise) return pdfMakePromise;
  pdfMakePromise = (async () => {
    const pdfModule = await import("pdfmake/build/pdfmake");
    const pdfMake = pdfModule.default || pdfModule;
    if (typeof pdfMake.addVirtualFileSystem !== "function") {
      throw new Error(
        "Loaded pdfmake but addVirtualFileSystem() is missing — version mismatch?"
      );
    }

    // Pull the vfs source file as a string. Vite's `?raw` returns the file
    // contents as the default export, which works for files inside
    // node_modules too. This bypasses ALL CJS↔ESM interop ambiguity for
    // this one file (the font data is just an object literal).
    const vfsRawModule = await import("pdfmake/build/vfs_fonts.js?raw");
    const vfsSource = vfsRawModule.default || vfsRawModule;
    if (typeof vfsSource !== "string" || vfsSource.length < 1024) {
      throw new Error("Could not load vfs_fonts.js as raw text.");
    }

    // Evaluate the script in a sandbox that supplies a fake `module`,
    // `exports`, and a stand-in for the various `_global` references the
    // file probes (`window`, `global`, `self`). The script's closing line
    // (`module.exports = vfs;`) puts the font dictionary onto our fake
    // module object, which we then read back.
    const fakeModule = { exports: {} };
    const fakeGlobal = {};
    // eslint-disable-next-line no-new-func
    const evaluate = new Function(
      "module",
      "exports",
      "window",
      "self",
      "global",
      "globalThis",
      vfsSource
    );
    evaluate(
      fakeModule,
      fakeModule.exports,
      fakeGlobal,
      fakeGlobal,
      fakeGlobal,
      fakeGlobal
    );
    const vfs = fakeModule.exports;
    if (
      !vfs ||
      typeof vfs !== "object" ||
      typeof vfs["Roboto-Medium.ttf"] !== "string"
    ) {
      throw new Error(
        "vfs_fonts.js evaluated but the expected fonts were not found on module.exports."
      );
    }

    pdfMake.addVirtualFileSystem(vfs);

    // Smoke-check: ask pdfmake's internal virtual fs whether the font is
    // reachable. If addVirtualFileSystem somehow no-op'd, surface that
    // here instead of letting the createPdf call crash with the cryptic
    // Buffer.from(undefined) error the user originally hit.
    const ok =
      pdfMake.virtualfs &&
      typeof pdfMake.virtualfs.existsSync === "function" &&
      pdfMake.virtualfs.existsSync("Roboto-Medium.ttf");
    if (!ok) {
      throw new Error(
        "Fonts were registered but pdfmake's virtual fs still doesn't see Roboto-Medium.ttf."
      );
    }

    return pdfMake;
  })();
  // If the load fails, clear the cached promise so the next click can retry
  // instead of being served the same rejected promise forever.
  pdfMakePromise.catch(() => {
    pdfMakePromise = null;
  });
  return pdfMakePromise;
}

/**
 * Build the pdfmake document definition for one order.
 *
 * Layout:
 *   - Brand banner with order id + status pill on the right
 *   - Two-column "Customer / Placed" block
 *   - Items table (Item / Qty / Price / Subtotal)
 *   - Right-aligned totals box (subtotal, discount, shipping, tax, total)
 *   - Footer line with the SmartCart admin attribution
 *
 * Styles live in `styles` so we can reuse them across cells without
 * re-declaring colour/size on every node. The colour palette mirrors the
 * admin console so the PDF feels like an extension of the UI.
 */
function buildInvoiceDocDefinition(order) {
  const items = Array.isArray(order.items) ? order.items : [];
  const { subtotal, discount, tax, shipping, total } = orderAmounts(order);

  const itemsHeader = [
    { text: "Item", style: "th" },
    { text: "Qty", style: "th", alignment: "right" },
    { text: "Price", style: "th", alignment: "right" },
    { text: "Subtotal", style: "th", alignment: "right" },
  ];

  const itemRows =
    items.length > 0
      ? items.map((it) => {
          const qty = Number(it.quantity || 1);
          const price = Number(it.priceAtPurchase ?? it.price ?? 0);
          return [
            { text: it.title || it.id || "Item", style: "td" },
            { text: String(qty), style: "td", alignment: "right" },
            { text: formatMoney(price), style: "td", alignment: "right" },
            { text: formatMoney(qty * price), style: "td", alignment: "right" },
          ];
        })
      : [
          [
            {
              text: "No items recorded.",
              colSpan: 4,
              style: "td",
              color: "#64748b",
              italics: true,
            },
            {},
            {},
            {},
          ],
        ];

  const totalsLines = [
    { label: "Subtotal", value: formatMoney(subtotal) },
    discount ? { label: "Discount", value: `-${formatMoney(discount)}` } : null,
    shipping ? { label: "Shipping", value: formatMoney(shipping) } : null,
    tax ? { label: "Tax", value: formatMoney(tax) } : null,
  ].filter(Boolean);

  const statusLabel =
    STATUS_META[order.status]?.label || order.status || "Processing";

  return {
    pageSize: "A4",
    pageMargins: [40, 48, 40, 48],
    info: {
      title: `SmartCart invoice ${order.id}`,
      author: "SmartCart",
    },
    defaultStyle: { font: "Roboto", fontSize: 10, color: "#141b2b" },

    content: [
      {
        columns: [
          [
            { text: "SmartCart", style: "brand" },
            { text: "Order invoice", color: "#64748b", fontSize: 10, margin: [0, 2, 0, 0] },
          ],
          {
            stack: [
              {
                text: statusLabel.toUpperCase(),
                color: "#5527b6",
                background: "#ede9fe",
                bold: true,
                fontSize: 9,
                alignment: "right",
                margin: [0, 0, 0, 4],
              },
              {
                text: `#${order.id}`,
                alignment: "right",
                color: "#64748b",
                fontSize: 10,
              },
            ],
          },
        ],
      },

      {
        canvas: [
          { type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: "#e2e8f0" },
        ],
        margin: [0, 14, 0, 14],
      },

      {
        columns: [
          {
            stack: [
              { text: "CUSTOMER", style: "label" },
              {
                text: order.userEmail || order.userId || "—",
                bold: true,
                margin: [0, 4, 0, 0],
              },
            ],
          },
          {
            stack: [
              { text: "PLACED", style: "label" },
              {
                text: new Date(order.createdAt || Date.now()).toLocaleString(),
                bold: true,
                margin: [0, 4, 0, 0],
              },
            ],
          },
        ],
        columnGap: 24,
      },

      {
        margin: [0, 22, 0, 0],
        table: {
          headerRows: 1,
          widths: ["*", 50, 80, 90],
          body: [itemsHeader, ...itemRows],
        },
        layout: {
          hLineWidth: (i) => (i === 1 ? 1 : 0.5),
          vLineWidth: () => 0,
          hLineColor: () => "#e2e8f0",
          fillColor: (rowIndex) => (rowIndex === 0 ? "#f8fafc" : null),
          paddingTop: () => 8,
          paddingBottom: () => 8,
        },
      },

      {
        margin: [0, 18, 0, 0],
        columns: [
          { width: "*", text: "" },
          {
            width: 220,
            stack: [
              ...totalsLines.map((line) => ({
                columns: [
                  { text: line.label, color: "#64748b", fontSize: 11 },
                  { text: line.value, alignment: "right", fontSize: 11 },
                ],
                margin: [0, 2, 0, 2],
              })),
              {
                canvas: [
                  {
                    type: "line",
                    x1: 0,
                    y1: 0,
                    x2: 220,
                    y2: 0,
                    lineWidth: 0.5,
                    lineColor: "#e2e8f0",
                  },
                ],
                margin: [0, 6, 0, 6],
              },
              {
                columns: [
                  { text: "Total", bold: true, fontSize: 14 },
                  {
                    text: formatMoney(total),
                    bold: true,
                    fontSize: 14,
                    alignment: "right",
                  },
                ],
              },
            ],
          },
        ],
      },

      {
        text: "Generated by SmartCart admin console",
        absolutePosition: { x: 40, y: 800 },
        color: "#94a3b8",
        fontSize: 9,
      },
    ],

    styles: {
      brand: { fontSize: 22, bold: true, color: "#141b2b" },
      label: { color: "#64748b", fontSize: 9, characterSpacing: 0.6 },
      th: {
        bold: true,
        color: "#64748b",
        fontSize: 9,
        characterSpacing: 0.6,
      },
      td: { fontSize: 11, color: "#141b2b" },
    },
  };
}

/**
 * Generate a PDF for the order and trigger a browser download.
 *
 * Replaces the older "open new window + window.print()" flow which froze
 * Chrome on most machines. The PDF is built entirely in-memory by pdfmake;
 * the user just sees a normal file download — no print dialog, no popup,
 * and the parent page stays interactive throughout.
 *
 * Returns a promise so the caller can show toast feedback / disable the
 * trigger button while the (lazy-loaded) pdfmake bundle is fetched and the
 * PDF blob is built. The promise resolves when `download()` finishes (it is
 * async in pdfmake 0.3+).
 */
async function downloadInvoicePdf(order) {
  const pdfMake = await loadPdfMake();
  const def = buildInvoiceDocDefinition(order);
  // pdfmake 0.3.x: `download(filename)` is async and returns a Promise. It
  // does not invoke a second-argument callback (that was an older API), so
  // wrapping it in `new Promise((resolve) => … callback)` would hang forever
  // and leave the UI stuck on "Preparing…".
  await pdfMake.createPdf(def).download(`smartcart-invoice-${order.id}.pdf`);
}

/* ---- Order detail drawer ----------------------------------------------*/
function OrderDrawer({ order, onClose, onStatusChange }) {
  const ref = useRef(null);
  const toast = useToast();
  const [pdfBusy, setPdfBusy] = useState(false);
  useFocusTrap(ref, Boolean(order));

  useEffect(() => {
    if (!order) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [order, onClose]);

  /**
   * Generate the invoice PDF for the currently open order. We disable the
   * trigger while the (lazy-loaded) pdfmake bundle downloads on the first
   * click; subsequent clicks reuse the cached module so they're instant.
   */
  const handleDownloadInvoice = async () => {
    if (!order || pdfBusy) return;
    setPdfBusy(true);
    try {
      await downloadInvoicePdf(order);
      toast.success(`Invoice for ${order.id} downloaded`);
    } catch (err) {
      toast.error(err?.message || "Couldn't generate the invoice PDF.");
    } finally {
      setPdfBusy(false);
    }
  };

  if (!order) return null;
  const status = order.status || "processing";
  const items = Array.isArray(order.items) ? order.items : [];
  const amounts = orderAmounts(order);

  return (
    <>
      <div className="adm-drawer-overlay" onClick={onClose} role="presentation" />
      <aside
        ref={ref}
        className="adm-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ao-drawer-title"
      >
        <header className="adm-drawer-head">
          <div>
            <h2 id="ao-drawer-title" className="adm-drawer-title">Order #{order.id}</h2>
            <p className="adm-drawer-sub">Placed {formatDateLong(order.createdAt)}</p>
          </div>
          <button
            type="button"
            className="adm-drawer-close"
            onClick={onClose}
            aria-label="Close order details"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <div className="adm-drawer-body">
          <section className="adm-drawer-section">
            <h4>Status</h4>
            <div className="ao-drawer-statusrow">
              <StatusBadge status={status} />
              <AdmDropdown
                value={status}
                options={[
                  { value: "processing", label: "Processing" },
                  { value: "transit", label: "In transit" },
                  { value: "delivered", label: "Delivered" },
                  { value: "cancelled", label: "Cancelled" },
                ]}
                onChange={(next) => onStatusChange(order, next)}
                ariaLabel={`Change status for order ${order.id}`}
              />
            </div>
          </section>

          <section className="adm-drawer-section">
            <h4>Customer</h4>
            <dl className="adm-drawer-grid">
              <dt>Email</dt><dd>{order.userEmail || "—"}</dd>
              <dt>User ID</dt><dd>{order.userId || "—"}</dd>
            </dl>
          </section>

          <section className="adm-drawer-section">
            <h4>Items ({items.length})</h4>
            <ul className="ao-line-items">
              {items.length === 0 ? (
                <li className="ao-line-empty">No items recorded.</li>
              ) : (
                items.map((it, i) => {
                  const qty = Number(it.quantity || 1);
                  const price = Number(it.unitPrice ?? it.priceAtPurchase ?? it.price ?? 0);
                  return (
                    <li key={`${it.id || it.title}-${i}`} className="ao-line">
                      <span className="ao-line-thumb" aria-hidden="true">
                        {it.image ? (
                          <img src={it.image} alt="" loading="lazy" />
                        ) : (
                          <span>—</span>
                        )}
                      </span>
                      <span className="ao-line-meta">
                        <strong>{it.title || it.id}</strong>
                        <small>{qty} × {formatMoney(price)}</small>
                      </span>
                      <strong className="ao-line-total">{formatMoney(qty * price)}</strong>
                    </li>
                  );
                })
              )}
            </ul>
          </section>

          <section className="adm-drawer-section">
            <h4>Totals</h4>
            <dl className="adm-drawer-grid">
              <dt>Subtotal</dt><dd>{formatMoney(amounts.subtotal)}</dd>
              {amounts.discount > 0 ? (
                <>
                  <dt>Discount</dt>
                  <dd>−{formatMoney(amounts.discount)}</dd>
                </>
              ) : null}
              {amounts.shipping > 0 ? (
                <>
                  <dt>Shipping</dt>
                  <dd>{formatMoney(amounts.shipping)}</dd>
                </>
              ) : null}
              {amounts.tax > 0 ? (
                <>
                  <dt>Tax</dt>
                  <dd>{formatMoney(amounts.tax)}</dd>
                </>
              ) : null}
              <dt>Total</dt><dd><strong>{formatMoney(amounts.total)}</strong></dd>
            </dl>
          </section>

          {order.deliveredAt || order.cancelledAt || order.updatedAt ? (
            <section className="adm-drawer-section">
              <h4>Timeline</h4>
              <ul className="ao-timeline">
                <li>
                  <span className="ao-tl-dot" /> Placed · {formatDateLong(order.createdAt)}
                </li>
                {order.updatedAt && order.updatedAt !== order.createdAt ? (
                  <li>
                    <span className="ao-tl-dot ao-tl-dot--info" /> Last updated · {formatDateLong(order.updatedAt)}
                  </li>
                ) : null}
                {order.deliveredAt ? (
                  <li>
                    <span className="ao-tl-dot ao-tl-dot--ok" /> Delivered · {formatDateLong(order.deliveredAt)}
                  </li>
                ) : null}
                {order.cancelledAt ? (
                  <li>
                    <span className="ao-tl-dot ao-tl-dot--danger" /> Cancelled · {formatDateLong(order.cancelledAt)}
                  </li>
                ) : null}
              </ul>
            </section>
          ) : null}
        </div>

        <footer className="adm-drawer-foot">
          <button
            type="button"
            className="adm-btn adm-btn-ghost"
            onClick={onClose}
          >
            Close
          </button>
          <button
            type="button"
            className="adm-btn adm-btn-primary"
            onClick={handleDownloadInvoice}
            disabled={pdfBusy}
            title="Download a PDF copy of this invoice"
          >
            <Download size={14} aria-hidden="true" />
            {pdfBusy ? "Preparing…" : "Download invoice"}
          </button>
        </footer>
      </aside>
    </>
  );
}

function OrderSkeletonRow({ withCheckbox = true }) {
  return (
    <tr aria-hidden="true">
      {withCheckbox ? <td><span className="adm-checkbox" /></td> : null}
      <td><span className="adm-skel adm-skel-line" style={{ width: "40%" }} /></td>
      <td><span className="adm-skel adm-skel-line" style={{ width: "70%" }} /></td>
      <td><span className="adm-skel adm-skel-line" style={{ width: "60%" }} /></td>
      <td><span className="adm-skel adm-skel-line" style={{ width: "30%" }} /></td>
      <td><span className="adm-skel adm-skel-line" style={{ width: "50%" }} /></td>
      <td><span className="adm-skel adm-skel-line" style={{ width: "40%" }} /></td>
      <td><span className="adm-skel adm-skel-line" style={{ width: "60%" }} /></td>
    </tr>
  );
}

export default function AdminOrders() {
  usePageMeta({
    title: "Admin Orders",
    description: "Review and update SmartCart orders.",
  });

  const toast = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [updating, setUpdating] = useState(null);
  const [dateRange, setDateRange] = useState("all");
  const [drawerOrder, setDrawerOrder] = useState(null);
  const [selected, setSelected] = useState(() => new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const filterRef = useRef(null);
  const headerCheckboxRef = useRef(null);

  useEffect(() => {
    if (!filterOpen) return undefined;
    const onClick = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setFilterOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === "Escape") setFilterOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [filterOpen]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await adminListOrders();
        if (cancelled) return;
        setOrders(data.orders || []);
      } catch (err) {
        if (cancelled) return;
        setError(err.response?.data?.message || "Couldn't load orders.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ------------------------------------------------------------------
   * Honor `?focus=<orderId>` / `?q=<term>` from the global topbar search
   * and any other deep-links. When the params are present we apply them
   * once and then strip them from the URL — otherwise a stale `?q=` in
   * the address bar would keep overwriting whatever the user types into
   * the local search box.
   * ----------------------------------------------------------------*/
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const focusId = searchParams.get("focus");
    const focusQ = searchParams.get("q");
    if (focusQ == null && !focusId) return;

    if (focusQ != null) setSearch(focusQ);

    if (focusId && orders.length > 0) {
      const found = orders.find((o) => String(o.id) === String(focusId));
      if (found) setDrawerOrder(found);
    }

    // Wait until the orders list has loaded before consuming `focus=` — if
    // we strip it too early the matching row won't have arrived yet and
    // the drawer would never open.
    if (focusId && orders.length === 0) return;

    const next = new URLSearchParams(searchParams);
    next.delete("focus");
    next.delete("q");
    setSearchParams(next, { replace: true });
  }, [orders, searchParams, setSearchParams]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const cutoff = dateRange === "all"
      ? null
      : Date.now() - Number(dateRange) * 86400000;
    return orders.filter((o) => {
      if (statusFilter && (o.status || "processing") !== statusFilter) return false;
      if (cutoff != null) {
        const ts = Date.parse(o.createdAt);
        if (!ts || ts < cutoff) return false;
      }
      if (!q) return true;
      const hay = `${o.id} ${o.userEmail || ""} ${o.userId || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [orders, search, statusFilter, dateRange]);

  const totalPages = Math.max(1, Math.ceil(visible.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = useMemo(
    () => visible.slice((safePage - 1) * pageSize, safePage * pageSize),
    [visible, safePage, pageSize]
  );

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, dateRange, pageSize]);

  async function changeStatus(order, status) {
    setUpdating(order.id);
    try {
      const data = await adminUpdateOrderStatus(order.id, status);
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? data.order : o))
      );
      // Reflect the change in the drawer too if it's showing this order.
      setDrawerOrder((curr) => (curr?.id === order.id ? data.order : curr));
      toast.success(`Order ${order.id} marked ${STATUS_META[status]?.label.toLowerCase() || status}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't update status.");
    } finally {
      setUpdating(null);
    }
  }

  /* Export to PDF. If any rows are checked we export only those; otherwise
   * we export the entire current filtered view so admins can grab "all
   * orders this month" by combining the date dropdown + Export. */
  const handleExportPdf = async () => {
    const rows = selected.size > 0
      ? orders.filter((o) => selected.has(o.id))
      : visible;
    if (rows.length === 0) {
      toast.info("Nothing to export yet — try widening the filter.");
      return;
    }
    try {
      await downloadOrdersPdf(rows);
      toast.success(
        `Downloaded ${rows.length} order${rows.length === 1 ? "" : "s"} as PDF`
      );
    } catch (err) {
      toast.error(err?.message || "Couldn't generate orders PDF.");
    }
  };

  async function bulkChangeStatus(status) {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    const snapshot = ids
      .map((id) => orders.find((o) => o.id === id))
      .filter(Boolean)
      .map((o) => ({ ...o }));

    setOrders((prev) =>
      prev.map((o) => (ids.includes(o.id) ? { ...o, status } : o))
    );

    setBulkBusy(true);
    try {
      const data = await adminBulkUpdateOrderStatus(ids, status);
      setOrders((prev) =>
        prev.map((o) => {
          const upd = data.orders.find((u) => u.id === o.id);
          return upd || o;
        })
      );
      setSelected(new Set());
      const label = STATUS_META[status]?.label.toLowerCase() || status;
      const count = data.updatedCount ?? ids.length;
      toast.success(
        `Marked ${count} order${count === 1 ? "" : "s"} as ${label}`,
        {
          duration: 9000,
          action: {
            label: "Undo",
            onClick: async () => {
              try {
                await Promise.all(
                  snapshot.map((s) =>
                    adminUpdateOrderStatus(s.id, s.status || "processing")
                  )
                );
                setOrders((prev) =>
                  prev.map((o) => {
                    const snap = snapshot.find((s) => s.id === o.id);
                    return snap ? { ...o, ...snap } : o;
                  })
                );
                toast.info("Reverted bulk status update.");
              } catch (err) {
                toast.error(
                  err.response?.data?.message || "Couldn't undo that change."
                );
              }
            },
          },
        }
      );
    } catch (err) {
      setOrders((prev) =>
        prev.map((o) => {
          const snap = snapshot.find((s) => s.id === o.id);
          return snap ? { ...o, ...snap } : o;
        })
      );
      toast.error(err.response?.data?.message || "Bulk update failed.");
    } finally {
      setBulkBusy(false);
    }
  }

  function clearOrderFilters() {
    setSearch("");
    setStatusFilter("");
    setDateRange("all");
  }

  const activeFilterLabel =
    STATUSES.find((s) => s.value === statusFilter)?.label || "All statuses";

  /* Selection helpers (operate against the visible page rows). */
  const visibleIds = pageRows.map((o) => o.id);
  const allChecked = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));
  const someChecked = visibleIds.some((id) => selected.has(id));
  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = someChecked && !allChecked;
    }
  }, [someChecked, allChecked]);
  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allChecked) {
        for (const id of visibleIds) next.delete(id);
      } else {
        for (const id of visibleIds) next.add(id);
      }
      return next;
    });
  };
  const toggleOne = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <AdminLayout
      title="Orders"
      subtitle="Track every order placed in the storefront and move them through fulfilment."
      actions={
        <>
          <button
            type="button"
            className="adm-btn"
            onClick={handleExportPdf}
            title="Download the current view as PDF"
            disabled={loading}
          >
            <Download size={14} aria-hidden="true" />
            Export PDF
          </button>
          {/* <button
            type="button"
            className="adm-btn"
            onClick={() => window.print()}
            title="Print the visible orders list"
            disabled={loading}
          >
            <Printer size={14} aria-hidden="true" />
            Print
          </button> */}
        </>
      }
    >
      {error ? <p className="ao-error" role="alert">{error}</p> : null}

      <section className="adm-card ao-toolbar">
        <label className="ao-search">
          <Search size={16} aria-hidden="true" />
          <input
            type="search"
            placeholder="Search by order id or customer email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search orders"
          />
        </label>
        <AdmDropdown
          value={dateRange}
          options={DATE_RANGES}
          onChange={setDateRange}
          ariaLabel="Date range"
        />
        <div className="ao-filter" ref={filterRef}>
          <button
            type="button"
            className={
              (statusFilter ? "adm-btn-primary" : "adm-btn") + " ao-filter-trigger"
            }
            onClick={() => setFilterOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={filterOpen}
          >
            <Filter size={14} aria-hidden="true" />
            <span>{activeFilterLabel}</span>
          </button>
          {filterOpen ? (
            <ul className="ao-filter-menu" role="menu">
              {STATUSES.map((s) => (
                <li key={s.value || "all"}>
                  <button
                    type="button"
                    role="menuitemradio"
                    aria-checked={statusFilter === s.value}
                    className={
                      "ao-filter-option" +
                      (statusFilter === s.value ? " ao-filter-option--active" : "")
                    }
                    onClick={() => {
                      setStatusFilter(s.value);
                      setFilterOpen(false);
                    }}
                  >
                    <CheckCircle2
                      size={14}
                      aria-hidden="true"
                      style={{
                        opacity: statusFilter === s.value ? 1 : 0,
                      }}
                    />
                    {s.label}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </section>

      {selected.size > 0 ? (
        <div className="adm-bulkbar adm-bulkbar--sticky" role="status" aria-live="polite">
          <span className="adm-bulkbar-text">
            {selected.size} order{selected.size === 1 ? "" : "s"} selected
          </span>
          <div className="adm-bulkbar-actions">
            <AdmDropdown
              value="__bulk__"
              options={[
                { value: "__bulk__", label: "Mark as…" },
                { value: "processing", label: "Processing" },
                { value: "transit", label: "In transit" },
                { value: "delivered", label: "Delivered" },
                { value: "cancelled", label: "Cancelled" },
              ]}
              onChange={(v) => v !== "__bulk__" && bulkChangeStatus(v)}
              ariaLabel="Bulk update status"
              disabled={bulkBusy}
            />
            <button
              type="button"
              className="adm-btn"
              onClick={handleExportPdf}
              disabled={bulkBusy}
              title="Download the selected orders as PDF"
            >
              <Download size={14} aria-hidden="true" />
              Export selected
            </button>
            <button
              type="button"
              className="adm-btn adm-btn-ghost"
              onClick={() => setSelected(new Set())}
              disabled={bulkBusy}
            >
              Clear
            </button>
          </div>
        </div>
      ) : null}

      <section className="adm-card ao-table-card">
        <div className="ao-table-scroll">
          <table className="ao-table" aria-label="Orders">
            <thead>
              <tr>
                <th scope="col" className="adm-th-check">
                  <input
                    ref={headerCheckboxRef}
                    type="checkbox"
                    className="adm-checkbox"
                    checked={allChecked}
                    onChange={toggleAll}
                    aria-label="Select all on this page"
                  />
                </th>
                <th scope="col">Order</th>
                <th scope="col">Customer</th>
                <th scope="col">Items</th>
                <th scope="col">Total</th>
                <th scope="col">Placed</th>
                <th scope="col">Status</th>
                <th scope="col" className="ao-th-actions">Update</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <OrderSkeletonRow key={`sk-${i}`} />
                ))
              ) : pageRows.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="adm-empty-state">
                      <span className="adm-empty-icon">
                        <Inbox size={26} aria-hidden="true" />
                      </span>
                      <h3 className="adm-empty-title">
                        {orders.length === 0 ? "No orders yet" : "No orders match your filters"}
                      </h3>
                      <p className="adm-empty-text">
                        {orders.length === 0
                          ? "Once customers start placing orders they'll appear here in real time."
                          : "Try widening the date range or clearing the status filter."}
                      </p>
                      <div className="adm-empty-actions">
                        {orders.length === 0 ? null : (
                          <>
                            <button
                              type="button"
                              className="adm-btn adm-btn-primary"
                              onClick={clearOrderFilters}
                            >
                              Clear filters
                            </button>
                            <button
                              type="button"
                              className="adm-btn"
                              onClick={handleExportPdf}
                            >
                              <Download size={16} aria-hidden="true" />
                              Export PDF
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                pageRows.map((o) => {
                  const status = o.status || "processing";
                  const isUpdating = updating === o.id;
                  return (
                    <tr
                      key={o.id}
                      className={
                        "ao-row" + (selected.has(o.id) ? " ao-row--selected" : "")
                      }
                    >
                      <td className="adm-td-check" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="adm-checkbox"
                          checked={selected.has(o.id)}
                          onChange={() => toggleOne(o.id)}
                          aria-label={`Select order ${o.id}`}
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="ao-id-btn"
                          onClick={() => setDrawerOrder(o)}
                        >
                          #{o.id}
                        </button>
                      </td>
                      <td>
                        <span className="ao-customer">
                          {o.userEmail || o.userId || "—"}
                        </span>
                      </td>
                      <td className="ao-items">{summariseItems(o.items)}</td>
                      <td>{formatMoney(orderAmounts(o).total)}</td>
                      <td>{formatDate(o.createdAt)}</td>
                      <td>
                        <StatusBadge status={status} />
                      </td>
                      <td>
                        <AdmDropdown
                          value={status}
                          options={[
                            { value: "processing", label: "Processing" },
                            { value: "transit", label: "In transit" },
                            { value: "delivered", label: "Delivered" },
                            { value: "cancelled", label: "Cancelled" },
                          ]}
                          onChange={(next) => changeStatus(o, next)}
                          disabled={isUpdating}
                          ariaLabel={`Update status for order ${o.id}`}
                          menuAlign="right"
                          className="ao-status-dd"
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!loading && visible.length > 0 ? (
          <div className="adm-pagination">
            <div className="adm-pagination-info">
              <span>
                Showing {(safePage - 1) * pageSize + 1}–
                {Math.min(safePage * pageSize, visible.length)} of {visible.length}
              </span>
              <AdmDropdown
                value={String(pageSize)}
                options={PAGE_SIZE_OPTIONS}
                onChange={(v) => setPageSize(Number(v))}
                ariaLabel="Rows per page"
              />
            </div>
            <div className="adm-pagination-controls">
              <button
                type="button"
                className="adm-pager-btn"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                aria-label="Previous page"
              >
                <ChevronLeft size={16} aria-hidden="true" />
              </button>
              <span className="adm-pager-page">
                Page {safePage} of {totalPages}
              </span>
              <button
                type="button"
                className="adm-pager-btn"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                aria-label="Next page"
              >
                <ChevronRight size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <OrderDrawer
        order={drawerOrder}
        onClose={() => setDrawerOrder(null)}
        onStatusChange={changeStatus}
      />
    </AdminLayout>
  );
}
