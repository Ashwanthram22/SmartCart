import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Inbox,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import AdminLayout from "./AdminLayout";
import AdmDropdown from "./AdmDropdown";
import ImageUpload from "./ImageUpload";
import ImportProductsModal from "./ImportProductsModal";
import { exportProductsCsv } from "./csvExport";
import {
  adminCreateProduct,
  adminDeleteProduct,
  adminListProducts,
  adminUpdateProduct,
} from "../../api/client";
import { useToast } from "../../hooks/useToast";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import usePageMeta from "../../hooks/usePageMeta";
import { formatMoney } from "../../utils/money";
import "./AdminInventory.css";

/**
 * Compact relative-time string used by the "Last edited" inventory column.
 * Keeps the helper local because both shapes ("Just now", "2m ago",
 * "3d ago") and consumers are scoped to admin tables; we explicitly do
 * NOT want the chatty "2 minutes ago" wording from the dashboard's longer
 * helper to compete with the row's other text.
 */
function formatEditedRelative(iso) {
  const ts = Date.parse(iso);
  if (!ts) return "";
  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

const SEGMENT_OPTIONS = [
  "AI Picks",
  "Trending",
  "Smartphones",
  "Computers",
  "Audio",
  "Wearables",
  "Smart Home",
  "Cameras",
  "Gaming",
  "Accessories",
];

function emptyProduct() {
  return {
    id: null,
    title: "",
    brand: "",
    category: "",
    description: "",
    price: "",
    originalPrice: "",
    stock: "",
    rating: 4.5,
    reviewCount: 0,
    image: "",
    images: [],
    catalogSegments: ["AI Picks"],
    specsList: [{ key: "", value: "" }],
  };
}

function fromProduct(p) {
  if (!p) return emptyProduct();
  const specsList = p.specs && Object.keys(p.specs).length > 0
    ? Object.entries(p.specs).map(([key, value]) => ({ key, value: String(value) }))
    : [{ key: "", value: "" }];
  return {
    id: p.id,
    title: p.title || "",
    brand: p.brand || "",
    category: p.category || "",
    description: p.description || "",
    price: p.price ?? "",
    originalPrice: p.originalPrice ?? "",
    stock: p.stock ?? "",
    rating: p.rating ?? 4.5,
    reviewCount: p.reviewCount ?? 0,
    image: p.image || "",
    images: Array.isArray(p.images) && p.images.length > 0
      ? p.images
      : p.image
      ? [p.image]
      : [],
    catalogSegments: Array.isArray(p.catalogSegments) ? p.catalogSegments : ["AI Picks"],
    specsList,
  };
}

function toPayload(form) {
  const specs = {};
  for (const row of form.specsList || []) {
    if (row.key && row.value) specs[row.key.trim()] = row.value.trim();
  }
  return {
    title: form.title.trim(),
    brand: form.brand.trim(),
    category: form.category.trim(),
    description: form.description.trim(),
    price: Number(form.price),
    originalPrice: form.originalPrice === "" ? null : Number(form.originalPrice),
    stock: Number(form.stock || 0),
    rating: Number(form.rating || 4.5),
    reviewCount: Number(form.reviewCount || 0),
    image: form.images?.[0] || form.image || "",
    images: form.images || [],
    catalogSegments: form.catalogSegments || [],
    specs,
  };
}

/* Cheap-but-stable comparison used by the unsaved-changes guard. JSON
 * stringify is fine here because the form shape is small and stable. */
function isFormDirty(initial, current) {
  return JSON.stringify(fromProduct(initial)) !== JSON.stringify(current);
}

function ProductFormBody({ initial, onClose, onSaved, onRequestClose }) {
  const ref = useRef(null);
  useFocusTrap(ref, true);
  const toast = useToast();
  const [form, setForm] = useState(() => fromProduct(initial));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Tell the parent if the form is dirty so it can intercept close.
  useEffect(() => {
    onRequestClose?.(isFormDirty(initial, form));
  }, [form, initial, onRequestClose]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const editing = Boolean(initial?.id);
  const update = (patch) => setForm((prev) => ({ ...prev, ...patch }));
  const updateSpec = (idx, patch) =>
    setForm((prev) => ({
      ...prev,
      specsList: prev.specsList.map((row, i) => (i === idx ? { ...row, ...patch } : row)),
    }));
  const addSpecRow = () =>
    setForm((prev) => ({ ...prev, specsList: [...prev.specsList, { key: "", value: "" }] }));
  const removeSpecRow = (idx) =>
    setForm((prev) => {
      const next = prev.specsList.filter((_, i) => i !== idx);
      return {
        ...prev,
        specsList: next.length > 0 ? next : [{ key: "", value: "" }],
      };
    });

  const toggleSegment = (seg) => {
    setForm((prev) => {
      const has = prev.catalogSegments.includes(seg);
      return {
        ...prev,
        catalogSegments: has
          ? prev.catalogSegments.filter((s) => s !== seg)
          : [...prev.catalogSegments, seg],
      };
    });
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!form.title.trim() || form.title.trim().length < 2) {
      setError("Title must be at least 2 characters.");
      return;
    }
    if (!form.category.trim()) {
      setError("Category is required.");
      return;
    }
    const priceNum = Number(form.price);
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      setError("Price must be greater than 0.");
      return;
    }
    if (form.images.length === 0) {
      setError("Please add at least one product image.");
      return;
    }

    setBusy(true);
    try {
      const payload = toPayload(form);
      const data = editing
        ? await adminUpdateProduct(initial.id, payload)
        : await adminCreateProduct(payload);
      toast.success(editing ? "Product updated" : "Product added");
      onSaved(data.product);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Could not save product.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ai-dialog-overlay" role="presentation" onClick={onClose}>
      <div
        ref={ref}
        className="ai-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="ai-dialog-head">
          <div>
            <h2 id="ai-dialog-title">
              {editing ? "Edit product" : "Add new product"}
            </h2>
            <p>
              {editing
                ? "Update product details and inventory."
                : "Create a new product that will appear in the catalog."}
            </p>
          </div>
          <button
            type="button"
            className="ai-dialog-close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <form
          id="ai-product-form"
          className="ai-form"
          onSubmit={handleSubmit}
        >
          <div className="ai-form-grid">
            <label className="ai-field ai-field--wide">
              <span>Title</span>
              <input
                type="text"
                value={form.title}
                onChange={(e) => update({ title: e.target.value })}
                placeholder="Nebula Wireless Headphones"
                required
              />
            </label>
            <label className="ai-field">
              <span>Brand</span>
              <input
                type="text"
                value={form.brand}
                onChange={(e) => update({ brand: e.target.value })}
                placeholder="Nebula"
              />
            </label>
            <label className="ai-field">
              <span>Category</span>
              <input
                type="text"
                value={form.category}
                onChange={(e) => update({ category: e.target.value })}
                placeholder="Audio"
                required
              />
            </label>
            <label className="ai-field">
              <span>Price (INR)</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={(e) => update({ price: e.target.value })}
                required
              />
            </label>
            <label className="ai-field">
              <span>Original price (optional)</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.originalPrice}
                onChange={(e) => update({ originalPrice: e.target.value })}
              />
            </label>
            <label className="ai-field">
              <span>Stock</span>
              <input
                type="number"
                step="1"
                min="0"
                value={form.stock}
                onChange={(e) => update({ stock: e.target.value })}
                required
              />
            </label>
            <label className="ai-field">
              <span>Rating (0–5)</span>
              <input
                type="number"
                step="0.1"
                min="0"
                max="5"
                value={form.rating}
                onChange={(e) => update({ rating: e.target.value })}
              />
            </label>
            <label className="ai-field">
              <span>Review count</span>
              <input
                type="number"
                step="1"
                min="0"
                value={form.reviewCount}
                onChange={(e) => update({ reviewCount: e.target.value })}
              />
            </label>
            <label className="ai-field ai-field--wide">
              <span>Description</span>
              <textarea
                rows={4}
                value={form.description}
                onChange={(e) => update({ description: e.target.value })}
                placeholder="What makes this product special?"
              />
            </label>

            <div className="ai-field ai-field--wide">
              <span>Catalog segments</span>
              <div className="ai-segments">
                {SEGMENT_OPTIONS.map((seg) => {
                  const active = form.catalogSegments.includes(seg);
                  return (
                    <button
                      type="button"
                      key={seg}
                      onClick={() => toggleSegment(seg)}
                      className={"ai-seg" + (active ? " ai-seg--active" : "")}
                    >
                      {seg}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="ai-field ai-field--wide">
              <ImageUpload
                value={form.images}
                onChange={(images) => update({ images })}
              />
            </div>

            <div className="ai-field ai-field--wide">
              <span>Specifications</span>
              <div className="ai-specs">
                {form.specsList.map((row, idx) => (
                  <div className="ai-spec-row" key={idx}>
                    <input
                      type="text"
                      placeholder="Key (e.g. Battery)"
                      value={row.key}
                      onChange={(e) => updateSpec(idx, { key: e.target.value })}
                    />
                    <input
                      type="text"
                      placeholder="Value (e.g. 30 hours)"
                      value={row.value}
                      onChange={(e) => updateSpec(idx, { value: e.target.value })}
                    />
                    <button
                      type="button"
                      className="ai-spec-remove"
                      onClick={() => removeSpecRow(idx)}
                      aria-label={`Remove specification ${idx + 1}`}
                    >
                      <X size={14} aria-hidden="true" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="adm-btn ai-spec-add"
                  onClick={addSpecRow}
                >
                  <Plus size={14} aria-hidden="true" />
                  Add specification
                </button>
              </div>
            </div>
          </div>

          {error ? <p className="ai-form-error" role="alert">{error}</p> : null}
        </form>

        {/* Footer lives OUTSIDE the form so the scroll container (`.ai-form`)
         * doesn't have to fight a sticky footer for space. The submit button
         * is associated with the form via the HTML `form="ai-product-form"`
         * attribute so pressing it still triggers handleSubmit. This keeps
         * the actions permanently visible regardless of how long the form
         * scrolls and lets the modal's rounded corners stay clean. */}
        <footer className="ai-dialog-foot">
          <button
            type="button"
            className="adm-btn adm-btn-ghost"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="ai-product-form"
            className="adm-btn adm-btn-primary"
            disabled={busy}
          >
            {busy ? "Saving…" : editing ? "Save changes" : "Add product"}
          </button>
        </footer>
      </div>
    </div>
  );
}

function ProductFormDialog({ open, initial, onClose, onSaved }) {
  // Track dirtiness so we can prompt before discarding edits.
  const dirtyRef = useRef(false);
  const [discardOpen, setDiscardOpen] = useState(false);

  if (!open) return null;

  const requestClose = () => {
    if (dirtyRef.current) {
      setDiscardOpen(true);
      return;
    }
    onClose();
  };

  return (
    <>
      <ProductFormBody
        key={initial?.id || "__new__"}
        initial={initial}
        onClose={requestClose}
        onSaved={(p) => {
          dirtyRef.current = false;
          onSaved(p);
        }}
        onRequestClose={(dirty) => {
          dirtyRef.current = dirty;
        }}
      />
      <ConfirmDialog
        open={discardOpen}
        title="Discard unsaved changes?"
        message="Your edits to this product will be lost. This can't be undone."
        confirmLabel="Discard changes"
        tone="danger"
        onCancel={() => setDiscardOpen(false)}
        onConfirm={() => {
          dirtyRef.current = false;
          setDiscardOpen(false);
          onClose();
        }}
      />
    </>
  );
}

/* Generic confirm dialog used by delete + discard-changes flows. */
function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "danger",
  busy = false,
  onCancel,
  onConfirm,
}) {
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
    <div className="ai-dialog-overlay" role="presentation" onClick={onCancel}>
      <div
        ref={ref}
        className="ai-confirm"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="ai-confirm-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="ai-confirm-title">
          <AlertTriangle size={18} aria-hidden="true" /> {title}
        </h2>
        <p>{message}</p>
        <div className="ai-confirm-actions">
          <button
            type="button"
            className="adm-btn adm-btn-ghost"
            onClick={onCancel}
            disabled={busy}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={tone === "primary" ? "adm-btn adm-btn-primary" : "adm-btn adm-btn-danger"}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function StockBadge({ stock }) {
  const n = Number(stock);
  if (!Number.isFinite(n)) return <span className="ai-stock ai-stock--muted">—</span>;
  if (n === 0) return <span className="ai-stock ai-stock--out">Out of stock</span>;
  if (n <= 10) return <span className="ai-stock ai-stock--low">{n} left</span>;
  return <span className="ai-stock ai-stock--ok">{n} in stock</span>;
}

/*
 * Inline +/- stock adjuster is intentionally commented out for now — the
 * Edit modal already lets admins update stock and is the single source of
 * truth, so having a second inline editor was redundant. Keep the
 * component around in case we want quick-adjust back later (e.g. when a
 * dedicated stocktake screen lands).
 *
 * function StockAdjust({ product, onUpdated, onError }) {
 *   const [busy, setBusy] = useState(false);
 *   const stock = Math.max(0, Number(product.stock || 0));
 *
 *   const adjust = async (delta) => {
 *     if (busy) return;
 *     const next = Math.max(0, stock + delta);
 *     if (next === stock) return;
 *     setBusy(true);
 *     try {
 *       const data = await adminUpdateProduct(product.id, { stock: next });
 *       onUpdated(data.product);
 *     } catch (err) {
 *       onError?.(err.response?.data?.message || "Couldn't update stock.");
 *     } finally {
 *       setBusy(false);
 *     }
 *   };
 *
 *   return (
 *     <div className="ai-stock-cell">
 *       <StockBadge stock={stock} />
 *       <div className="ai-stock-step" aria-label={`Adjust stock for ${product.title}`}>
 *         <button type="button" className="ai-step-btn" onClick={() => adjust(-1)} disabled={busy || stock === 0} aria-label="Decrease stock by 1" title="Remove 1">
 *           <Minus size={12} aria-hidden="true" />
 *         </button>
 *         <button type="button" className="ai-step-btn" onClick={() => adjust(1)} disabled={busy} aria-label="Increase stock by 1" title="Add 1">
 *           <Plus size={12} aria-hidden="true" />
 *         </button>
 *       </div>
 *     </div>
 *   );
 * }
 */

function SortHeader({ field, label, sort, onToggle }) {
  const isActive = sort.field === field;
  const direction = isActive ? sort.direction : null;
  const Icon =
    direction === "asc" ? ArrowUp : direction === "desc" ? ArrowDown : ArrowUpDown;
  const ariaSort =
    direction === "asc"
      ? "ascending"
      : direction === "desc"
      ? "descending"
      : "none";
  const nextLabel =
    direction === null
      ? `Sort ${label.toLowerCase()} ascending`
      : direction === "asc"
      ? `Sort ${label.toLowerCase()} descending`
      : `Clear ${label.toLowerCase()} sort`;

  return (
    <button
      type="button"
      className={
        "ai-sort" +
        (isActive ? " ai-sort--active" : "") +
        (direction ? ` ai-sort--${direction}` : "")
      }
      onClick={() => onToggle(field)}
      aria-label={nextLabel}
      aria-pressed={isActive}
      data-aria-sort={ariaSort}
    >
      <span>{label}</span>
      <Icon size={14} aria-hidden="true" className="ai-sort-icon" />
    </button>
  );
}

/* CSV export logic now lives in `./csvExport.js` so AdminOrders can share
 * the same helpers and a future "shared exports" surface can grow there
 * without bloating every admin page. */

/* ---- Skeleton row used while products are loading ---------------------*/
function ProductSkeletonRow() {
  return (
    <tr aria-hidden="true">
      <td><span className="adm-checkbox" aria-hidden="true" /></td>
      <td>
        <div className="adm-skel-row">
          <span className="adm-skel adm-skel-thumb" />
          <span className="adm-skel-stack">
            <span className="adm-skel adm-skel-line adm-skel-line--lg" style={{ width: "70%" }} />
            <span className="adm-skel adm-skel-line adm-skel-line--sm" />
          </span>
        </div>
      </td>
      <td><span className="adm-skel adm-skel-line" style={{ width: "60%" }} /></td>
      <td><span className="adm-skel adm-skel-line" style={{ width: "40%" }} /></td>
      <td><span className="adm-skel adm-skel-line" style={{ width: "50%" }} /></td>
      <td><span className="adm-skel adm-skel-line" style={{ width: "65%" }} /></td>
      <td><span className="adm-skel adm-skel-line" style={{ width: "80%" }} /></td>
    </tr>
  );
}

/**
 * Inline cell rendered in the inventory table's "Last edited" column.
 * Shows a compact relative timestamp on the first line and the editor's
 * email/name on a second muted line. Uses a `title` attribute for the
 * full ISO date so admins can hover for the precise moment.
 */
function EditedCell({ product }) {
  const ts = product.updatedAt || product.createdAt;
  const editor = product.updatedBy || product.createdBy;
  if (!ts) return <span className="ai-edited ai-edited--empty">—</span>;
  const relative = formatEditedRelative(ts);
  const exact = new Date(ts).toLocaleString();
  return (
    <span className="ai-edited" title={exact}>
      <span className="ai-edited-time">{relative}</span>
      {editor ? <span className="ai-edited-by">by {editor}</span> : null}
    </span>
  );
}

/* Quick-filter chip values. Each maps to a predicate over `stock`. */
const STOCK_CHIPS = [
  { key: "all", label: "All" },
  { key: "low", label: "Low stock", filter: (p) => Number(p.stock) > 0 && Number(p.stock) <= 10 },
  { key: "out", label: "Out of stock", filter: (p) => Number(p.stock) === 0 },
];

const PAGE_SIZE_OPTIONS = [
  { value: "10", label: "10 / page" },
  { value: "25", label: "25 / page" },
  { value: "50", label: "50 / page" },
  { value: "100", label: "100 / page" },
];

export default function AdminInventory() {
  usePageMeta({
    title: "Admin Inventory",
    description: "Manage SmartCart products, stock and pricing.",
  });

  const toast = useToast();
  const searchInputRef = useRef(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [editTarget, setEditTarget] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [sort, setSort] = useState({ field: null, direction: null });
  const [chip, setChip] = useState("all");
  const [selected, setSelected] = useState(() => new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  // `deleteBusy` / `bulkBusy` were used by the old synchronous delete flow
  // to disable the confirm dialogs while the network request was in flight.
  // The new soft-delete flow closes the dialog immediately and defers the
  // request, so both flags are always false — kept as constants so the
  // dialog props (`busy={deleteBusy}`) keep their type and we can resurrect
  // a "Deleting…" state later if we add server-side soft-delete.
  const deleteBusy = false;
  const bulkBusy = false;
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const toggleSort = (field) => {
    setSort((prev) => {
      if (prev.field !== field) return { field, direction: "asc" };
      if (prev.direction === "asc") return { field, direction: "desc" };
      return { field: null, direction: null };
    });
  };

  /* Compute filtered + sorted set, plus per-chip counts (so the chips can
   * show live counts even when only one chip is active). */
  const { filtered, counts } = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matchesQ = (p) =>
      `${p.title} ${p.brand || ""} ${p.category || ""} ${p.id}`
        .toLowerCase()
        .includes(q);

    const base = q ? products.filter(matchesQ) : products;
    const c = {
      all: base.length,
      low: base.filter((p) => Number(p.stock) > 0 && Number(p.stock) <= 10).length,
      out: base.filter((p) => Number(p.stock) === 0).length,
    };
    const chipDef = STOCK_CHIPS.find((x) => x.key === chip);
    const chipped = chipDef?.filter ? base.filter(chipDef.filter) : base;
    if (!sort.field) return { filtered: chipped, counts: c };
    const dir = sort.direction === "asc" ? 1 : -1;
    const sorted = [...chipped].sort((a, b) => {
      const av = Number(a[sort.field] ?? 0);
      const bv = Number(b[sort.field] ?? 0);
      if (av === bv) return 0;
      return (av - bv) * dir;
    });
    return { filtered: sorted, counts: c };
  }, [products, search, sort, chip]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  // Clamp page when filtering changes the result count.
  const safePage = Math.min(page, totalPages);
  const pageRows = useMemo(
    () => filtered.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filtered, safePage, pageSize]
  );
  // Reset to first page whenever filters change.
  useEffect(() => {
    setPage(1);
  }, [search, chip, pageSize, sort]);

  // Initial product load.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await adminListProducts();
        if (cancelled) return;
        setProducts(data.products || []);
      } catch (err) {
        if (cancelled) return;
        setError(err.response?.data?.message || "Couldn't load products.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Honour `?new=1` (open create form) and `?q=...` (analytics drill-down).
  useEffect(() => {
    const wantsNew = searchParams.get("new") === "1";
    const initialQ = searchParams.get("q");
    if (!wantsNew && initialQ == null) return undefined;
    const handle = setTimeout(() => {
      if (wantsNew && !formOpen) {
        setEditTarget(null);
        setFormOpen(true);
      }
      if (initialQ != null) setSearch(initialQ);
      const next = new URLSearchParams(searchParams);
      if (wantsNew) next.delete("new");
      if (initialQ != null) next.delete("q");
      setSearchParams(next, { replace: true });
    }, 0);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Keyboard shortcuts: `n` opens new product. The `/` shortcut for search
  // is owned by the global topbar omnisearch (GlobalAdminSearch) so we
  // don't bind it again here — having two listeners fighting over the same
  // key produced inconsistent focus behaviour.
  useEffect(() => {
    const onKey = (e) => {
      if (formOpen || deleteTarget || bulkDeleteOpen) return;
      const t = e.target;
      const tag = t?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || t?.isContentEditable) return;
      if (e.key.toLowerCase() === "n" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setEditTarget(null);
        setFormOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [formOpen, deleteTarget, bulkDeleteOpen]);

  const openCreate = () => {
    setEditTarget(null);
    setFormOpen(true);
  };

  const openEdit = (product) => {
    setEditTarget(product);
    setFormOpen(true);
  };

  const openDuplicate = (product) => {
    // Strip id + create a "(copy)" title; opens as create not update.
    const copy = {
      ...product,
      id: null,
      title: `${product.title} (copy)`,
    };
    setEditTarget(copy);
    setFormOpen(true);
  };

  /* Called by the product modal when create/update returns from the API.
   * This is the *live update* path — the response is the canonical record
   * from the server (today: db.json, tomorrow: MongoDB) so we splice it
   * straight into local state. No refetch needed; the new title/price/
   * stock/category shows up the instant the modal closes. */
  const handleSaved = (saved) => {
    setProducts((prev) => {
      const idx = prev.findIndex((p) => p.id === saved.id);
      if (idx === -1) return [saved, ...prev];
      const next = prev.slice();
      next[idx] = saved;
      return next;
    });
  };

  /* ----------------------------------------------------------------------
   * Soft-delete with "Undo" toast.
   *
   * We give the admin a 6-second window to take it back: the affected rows
   * are removed from the local list immediately (great perceived perf), a
   * toast appears with an Undo button, and the actual server DELETE is
   * deferred via setTimeout. If Undo is clicked we clear the timeout and
   * restore the rows. If the toast times out, the deferred call fires.
   *
   * `pendingDeletes` holds the scheduled timers so we can cancel them on
   * undo. We also tear them down on unmount so HMR doesn't fire phantom
   * deletes after navigating away.
   * --------------------------------------------------------------------*/
  const UNDO_WINDOW_MS = 6000;
  const pendingDeletesRef = useRef(new Map());

  useEffect(() => {
    const timers = pendingDeletesRef.current;
    return () => {
      // Component unmount: let any pending deletes fire immediately so we
      // don't leave the server in an inconsistent state, then clear refs.
      timers.forEach(({ timeoutHandle, flush }) => {
        clearTimeout(timeoutHandle);
        flush?.();
      });
      timers.clear();
    };
  }, []);

  /**
   * Performs the actual server-side delete(s) for a previously soft-deleted
   * batch of products. Sequential to keep the JSON write queue happy. Bad
   * ids are surfaced via a follow-up error toast — the local list isn't
   * re-populated because the optimistic removal already matched the
   * eventual successful state for most/all rows.
   */
  const flushDeletes = async (products) => {
    const failures = [];
    for (const p of products) {
      try {
        await adminDeleteProduct(p.id);
      } catch (err) {
        failures.push({ id: p.id, title: p.title, message: err.response?.data?.message || "" });
      }
    }
    if (failures.length > 0) {
      // Restore the failed rows so they remain visible / editable. Use the
      // existing helper so the rows come back in the same shape.
      setProducts((prev) => {
        const restored = failures
          .map((f) => products.find((p) => p.id === f.id))
          .filter(Boolean);
        return [...restored, ...prev];
      });
      toast.error(
        failures.length === 1
          ? `Couldn't delete "${failures[0].title}" — restored.`
          : `Couldn't delete ${failures.length} product(s) — restored.`
      );
    }
  };

  /**
   * Schedule the soft-delete + Undo toast for one or many products.
   * Used by both the single-row delete confirm and the bulk-delete bar.
   */
  const scheduleSoftDelete = (productsToDelete) => {
    if (productsToDelete.length === 0) return;

    // Optimistically remove from local state and clear any selection.
    const ids = productsToDelete.map((p) => p.id);
    const idSet = new Set(ids);
    setProducts((prev) => prev.filter((p) => !idSet.has(p.id)));
    setSelected((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.delete(id));
      return next;
    });

    // Build the toast first so we have the toast id available for undo.
    const batchKey = ids.join(",");
    const label =
      productsToDelete.length === 1
        ? `Deleted "${productsToDelete[0].title}"`
        : `Deleted ${productsToDelete.length} products`;

    const flush = () => {
      pendingDeletesRef.current.delete(batchKey);
      flushDeletes(productsToDelete);
    };
    const undo = () => {
      const entry = pendingDeletesRef.current.get(batchKey);
      if (entry) {
        clearTimeout(entry.timeoutHandle);
        pendingDeletesRef.current.delete(batchKey);
      }
      // Restore products into local state. Order them at the top so the
      // admin sees the result of their undo without scrolling.
      setProducts((prev) => [...productsToDelete, ...prev]);
      toast.info(
        productsToDelete.length === 1
          ? `Restored "${productsToDelete[0].title}"`
          : `Restored ${productsToDelete.length} products`
      );
    };

    toast.show({
      message: label,
      variant: "success",
      duration: UNDO_WINDOW_MS,
      action: { label: "Undo", onClick: undo },
    });

    // Defer the actual server-side DELETE(s) until after the undo window
    // closes. The handle is stored alongside `flush` so undo can cancel it.
    const timeoutHandle = setTimeout(() => {
      const entry = pendingDeletesRef.current.get(batchKey);
      if (!entry) return; // Undo already ran.
      entry.flush();
    }, UNDO_WINDOW_MS);

    pendingDeletesRef.current.set(batchKey, { timeoutHandle, flush });
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    scheduleSoftDelete([target]);
  };

  const confirmBulkDelete = () => {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    const productsToDelete = products.filter((p) => ids.includes(p.id));
    setBulkDeleteOpen(false);
    scheduleSoftDelete(productsToDelete);
  };

  /* Selection helpers (operate against the visible page rows). */
  const visibleIds = pageRows.map((p) => p.id);
  const allChecked = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));
  const someChecked = visibleIds.some((id) => selected.has(id));
  const headerCheckboxRef = useRef(null);
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

  const clearSelection = useCallback(() => setSelected(new Set()), []);

  const exportCsv = () => {
    if (filtered.length === 0) {
      toast.info?.("Nothing to export.") ||
        toast.success("Nothing to export.");
      return;
    }
    exportProductsCsv(filtered);
    toast.success(`Exported ${filtered.length} product${filtered.length === 1 ? "" : "s"} to CSV`);
  };

  return (
    <AdminLayout
      title="Inventory"
      subtitle="Manage products, stock levels and catalog visibility."
      actions={
        <>
          <button
            type="button"
            className="adm-btn"
            onClick={() => setImportOpen(true)}
            title="Import products from a CSV file"
          >
            <Upload size={14} aria-hidden="true" />
            Import CSV
          </button>
          <button
            type="button"
            className="adm-btn"
            onClick={exportCsv}
            title="Download a CSV of the current view"
          >
            <Download size={14} aria-hidden="true" />
            Export CSV
          </button>
          <button
            type="button"
            className="adm-btn adm-btn-primary"
            onClick={openCreate}
            title="Add a new product (n)"
          >
            <Plus size={16} aria-hidden="true" />
            Add product
          </button>
        </>
      }
    >
      {error ? <p className="ai-error" role="alert">{error}</p> : null}

      <section className="adm-card ai-toolbar">
        <label className="ai-search">
          <Search size={16} aria-hidden="true" />
          <input
            ref={searchInputRef}
            type="search"
            placeholder="Search by title, brand, category or id…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search products"
          />
        </label>
        <ul className="adm-chips" role="tablist" aria-label="Filter by stock">
          {STOCK_CHIPS.map((c) => (
            <li key={c.key}>
              <button
                type="button"
                role="tab"
                aria-selected={chip === c.key}
                className={"adm-chip" + (chip === c.key ? " adm-chip--active" : "")}
                onClick={() => setChip(c.key)}
              >
                {c.label}
                <span className="adm-chip-count">{counts[c.key]}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {selected.size > 0 ? (
        <div className="adm-bulkbar" role="status" aria-live="polite">
          <span className="adm-bulkbar-text">
            {selected.size} selected
          </span>
          <div className="adm-bulkbar-actions">
            <button
              type="button"
              className="adm-btn adm-btn-ghost"
              onClick={clearSelection}
            >
              Clear
            </button>
            <button
              type="button"
              className="adm-btn adm-btn-danger"
              onClick={() => setBulkDeleteOpen(true)}
            >
              <Trash2 size={14} aria-hidden="true" />
              Delete selected
            </button>
          </div>
        </div>
      ) : null}

      <section className="adm-card ai-table-card">
        <div className="ai-table-scroll">
          <table className="ai-table" aria-label="Products">
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
                <th scope="col">Product</th>
                <th scope="col">Category</th>
                <th
                  scope="col"
                  aria-sort={
                    sort.field === "price"
                      ? sort.direction === "asc"
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                >
                  <SortHeader
                    field="price"
                    label="Price"
                    sort={sort}
                    onToggle={toggleSort}
                  />
                </th>
                <th
                  scope="col"
                  aria-sort={
                    sort.field === "stock"
                      ? sort.direction === "asc"
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                >
                  <SortHeader
                    field="stock"
                    label="Stock"
                    sort={sort}
                    onToggle={toggleSort}
                  />
                </th>
                <th scope="col" className="ai-th-edited">Last edited</th>
                <th scope="col" className="ai-th-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <ProductSkeletonRow key={`sk-${i}`} />
                ))
              ) : pageRows.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="adm-empty-state">
                      <span className="adm-empty-icon">
                        <Inbox size={26} aria-hidden="true" />
                      </span>
                      <h3 className="adm-empty-title">
                        {products.length === 0
                          ? "No products yet"
                          : "No products match your filters"}
                      </h3>
                      <p className="adm-empty-text">
                        {products.length === 0
                          ? "Add your first product to start populating the storefront catalog."
                          : "Try clearing the search or switching the stock filter."}
                      </p>
                      {products.length === 0 ? (
                        <button
                          type="button"
                          className="adm-btn adm-btn-primary"
                          onClick={openCreate}
                        >
                          <Plus size={14} aria-hidden="true" />
                          Add product
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ) : (
                pageRows.map((p) => (
                  <tr
                    key={p.id}
                    className={selected.has(p.id) ? "ai-row-selected" : ""}
                  >
                    <td className="adm-td-check">
                      <input
                        type="checkbox"
                        className="adm-checkbox"
                        checked={selected.has(p.id)}
                        onChange={() => toggleOne(p.id)}
                        aria-label={`Select ${p.title}`}
                      />
                    </td>
                    <td>
                      <div className="ai-prod">
                        <div className="ai-prod-thumb" aria-hidden="true">
                          {p.image ? (
                            <img src={p.image} alt="" loading="lazy" />
                          ) : (
                            <span>—</span>
                          )}
                        </div>
                        <div className="ai-prod-meta">
                          <strong>{p.title}</strong>
                          <span>{p.brand || "—"} • {p.id}</span>
                        </div>
                      </div>
                    </td>
                    <td>{p.category || "—"}</td>
                    <td>{formatMoney(p.price || 0)}</td>
                    <td>
                      <StockBadge stock={p.stock} />
                    </td>
                    <td>
                      <EditedCell product={p} />
                    </td>
                    <td>
                      <div className="ai-row-actions">
                        <button
                          type="button"
                          className="ai-row-btn"
                          onClick={() => openEdit(p)}
                          title="Edit"
                          aria-label={`Edit ${p.title}`}
                        >
                          <Pencil size={14} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className="ai-row-btn"
                          onClick={() => openDuplicate(p)}
                          title="Duplicate"
                          aria-label={`Duplicate ${p.title}`}
                        >
                          <Copy size={14} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className="ai-row-btn ai-row-btn--danger"
                          onClick={() => setDeleteTarget(p)}
                          title="Delete"
                          aria-label={`Delete ${p.title}`}
                        >
                          <Trash2 size={14} aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && filtered.length > 0 ? (
          <div className="adm-pagination">
            <div className="adm-pagination-info">
              <span>
                Showing {(safePage - 1) * pageSize + 1}–
                {Math.min(safePage * pageSize, filtered.length)} of {filtered.length}
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

      <ProductFormDialog
        open={formOpen}
        initial={editTarget}
        onClose={() => setFormOpen(false)}
        onSaved={handleSaved}
      />
      <ImportProductsModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={(createdProducts) => {
          // Prepend the newly created products into the local table so
          // they're visible without a full refetch. Using a Map keyed by
          // id keeps the order stable and dedupes against any duplicate
          // optimistic insertions (shouldn't happen, but cheap insurance).
          setProducts((prev) => {
            const byId = new Map(prev.map((p) => [p.id, p]));
            for (const created of createdProducts) {
              byId.set(created.id, created);
            }
            return Array.from(byId.values());
          });
        }}
        toast={toast}
      />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete product?"
        message={
          deleteTarget ? (
            <>
              <strong>{deleteTarget.title}</strong> will be removed from the catalog. This can't be undone.
            </>
          ) : ""
        }
        confirmLabel={deleteBusy ? "Deleting…" : "Delete"}
        tone="danger"
        busy={deleteBusy}
        onCancel={() => (deleteBusy ? null : setDeleteTarget(null))}
        onConfirm={confirmDelete}
      />
      <ConfirmDialog
        open={bulkDeleteOpen}
        title={`Delete ${selected.size} product${selected.size === 1 ? "" : "s"}?`}
        message="The selected products will be permanently removed from the catalog. This can't be undone."
        confirmLabel={bulkBusy ? "Deleting…" : "Delete all"}
        tone="danger"
        busy={bulkBusy}
        onCancel={() => (bulkBusy ? null : setBulkDeleteOpen(false))}
        onConfirm={confirmBulkDelete}
      />
    </AdminLayout>
  );
}
