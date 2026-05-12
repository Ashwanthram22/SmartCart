import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import AdminLayout from "./AdminLayout";
import ImageUpload from "./ImageUpload";
import {
  adminCreateProduct,
  adminDeleteProduct,
  adminListProducts,
  adminUpdateProduct,
} from "../../api/client";
import { useToast } from "../../hooks/useToast";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import usePageMeta from "../../hooks/usePageMeta";
import "./AdminInventory.css";

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

function ProductFormBody({ initial, onClose, onSaved }) {
  const ref = useRef(null);
  useFocusTrap(ref, true);
  const toast = useToast();
  // Initializer pulls from `initial` once on mount; the parent gives us a
  // fresh `key` whenever the target product changes, so we never need to
  // resync state inside an effect (which would be a lint violation).
  const [form, setForm] = useState(() => fromProduct(initial));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

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

        <form className="ai-form" onSubmit={handleSubmit}>
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
              <span>Price (USD)</span>
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
              className="adm-btn adm-btn-primary"
              disabled={busy}
            >
              {busy ? "Saving…" : editing ? "Save changes" : "Add product"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

/**
 * Thin wrapper that mounts the form body only while open, and uses a `key`
 * derived from the target product id so switching between create/edit (or
 * editing different products) replaces the form's state cleanly without
 * needing a sync `useEffect → setState` pass.
 */
function ProductFormDialog({ open, initial, onClose, onSaved }) {
  if (!open) return null;
  return (
    <ProductFormBody
      key={initial?.id || "__new__"}
      initial={initial}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}

function ConfirmDeleteDialog({ open, product, onCancel, onConfirm, busy }) {
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
          <AlertTriangle size={18} aria-hidden="true" /> Delete product?
        </h2>
        <p>
          <strong>{product?.title}</strong> will be removed from the catalog.
          This can't be undone.
        </p>
        <div className="ai-confirm-actions">
          <button
            type="button"
            className="adm-btn adm-btn-ghost"
            onClick={onCancel}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="button"
            className="adm-btn adm-btn-danger"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "Deleting…" : "Delete"}
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

export default function AdminInventory() {
  usePageMeta({
    title: "Admin Inventory",
    description: "Manage SmartCart products, stock and pricing.",
  });

  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [editTarget, setEditTarget] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) =>
      `${p.title} ${p.brand || ""} ${p.category || ""} ${p.id}`
        .toLowerCase()
        .includes(q)
    );
  }, [products, search]);

  // Initial product load. Inline so we don't trip the
  // `react-hooks/set-state-in-effect` rule with a synchronous setState in a
  // helper. Subsequent reloads happen automatically via local state mutations
  // (handleSaved / setProducts after delete) so we don't need a refetch.
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

  // Honour the `?new=1` querystring entrypoint so the dashboard FAB and the
  // "Add product" button can deep-link straight into the create form. We
  // queue the state changes in a microtask so we're not setting state
  // synchronously inside the effect body.
  useEffect(() => {
    if (searchParams.get("new") !== "1" || formOpen) return undefined;
    const handle = setTimeout(() => {
      setEditTarget(null);
      setFormOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete("new");
      setSearchParams(next, { replace: true });
    }, 0);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const openCreate = () => {
    setEditTarget(null);
    setFormOpen(true);
  };

  const openEdit = (product) => {
    setEditTarget(product);
    setFormOpen(true);
  };

  const handleSaved = (saved) => {
    setProducts((prev) => {
      const idx = prev.findIndex((p) => p.id === saved.id);
      if (idx === -1) return [saved, ...prev];
      const next = prev.slice();
      next[idx] = saved;
      return next;
    });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      await adminDeleteProduct(deleteTarget.id);
      setProducts((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setError(err.response?.data?.message || "Could not delete product.");
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <AdminLayout
      title="Inventory"
      subtitle="Manage products, stock levels and catalog visibility."
      actions={
        <button
          type="button"
          className="adm-btn adm-btn-primary"
          onClick={openCreate}
        >
          <Plus size={16} aria-hidden="true" />
          Add product
        </button>
      }
      onAddProduct={openCreate}
    >
      {error ? <p className="ai-error" role="alert">{error}</p> : null}

      <section className="adm-card ai-toolbar">
        <label className="ai-search">
          <Search size={16} aria-hidden="true" />
          <input
            type="search"
            placeholder="Search by title, brand, category or id…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search products"
          />
        </label>
        <span className="ai-count">
          {loading ? "Loading…" : `${filtered.length} product${filtered.length === 1 ? "" : "s"}`}
        </span>
      </section>

      <section className="adm-card ai-table-card">
        <div className="ai-table-scroll">
          <table className="ai-table" aria-label="Products">
            <thead>
              <tr>
                <th scope="col">Product</th>
                <th scope="col">Category</th>
                <th scope="col">Price</th>
                <th scope="col">Stock</th>
                <th scope="col" className="ai-th-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="ai-loading">Loading products…</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="ai-empty">
                    No products match your filters.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id}>
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
                    <td>${Number(p.price || 0).toFixed(2)}</td>
                    <td><StockBadge stock={p.stock} /></td>
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
      </section>

      <ProductFormDialog
        open={formOpen}
        initial={editTarget}
        onClose={() => setFormOpen(false)}
        onSaved={handleSaved}
      />
      <ConfirmDeleteDialog
        open={Boolean(deleteTarget)}
        product={deleteTarget}
        onCancel={() => (deleteBusy ? null : setDeleteTarget(null))}
        onConfirm={confirmDelete}
        busy={deleteBusy}
      />
    </AdminLayout>
  );
}
