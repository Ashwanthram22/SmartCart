import { useEffect, useState } from "react";
import { Pencil, Trash2, Star, Plus } from "lucide-react";
import {
  createAddress,
  deleteAddress,
  getAddresses,
  updateAddress,
} from "../../api/client";
import { useToast } from "../../hooks/useToast";
import usePageMeta from "../../hooks/usePageMeta";
import { ProfileLayout } from "./ProfileLayout";
import "./AddressBook.css";

const EMPTY_FORM = {
  label: "Home",
  fullName: "",
  line1: "",
  line2: "",
  city: "",
  postal: "",
  phone: "",
};

function isValid(form) {
  return (
    form.fullName.trim().length >= 2 &&
    form.line1.trim().length >= 2 &&
    form.city.trim().length >= 2 &&
    form.postal.trim().length >= 2
  );
}

export default function AddressBook() {
  usePageMeta({
    title: "Address book",
    description: "Save and manage shipping addresses for faster SmartCart AI checkout.",
  });

  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const toast = useToast();

  // editing state — `null` means closed, `"new"` means add form,
  // anything else is the address id being edited.
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saveDefault, setSaveDefault] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { addresses: list } = await getAddresses();
        if (!cancelled) setAddresses(Array.isArray(list) ? list : []);
      } catch {
        if (!cancelled) setError("Could not load your addresses.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const openNew = () => {
    setForm(EMPTY_FORM);
    setSaveDefault(addresses.length === 0);
    setEditing("new");
  };

  const openEdit = (a) => {
    setForm({
      label: a.label || "Home",
      fullName: a.fullName || "",
      line1: a.line1 || "",
      line2: a.line2 || "",
      city: a.city || "",
      postal: a.postal || "",
      phone: a.phone || "",
    });
    setSaveDefault(Boolean(a.isDefault));
    setEditing(a.id);
  };

  const closeForm = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
  };

  const update = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const submit = async () => {
    if (!isValid(form)) {
      toast.error("Please fill in name, address, city, and postal code.");
      return;
    }
    setBusy(true);
    try {
      if (editing === "new") {
        const { address } = await createAddress({
          ...form,
          isDefault: saveDefault,
        });
        setAddresses((prev) => {
          const next = address.isDefault
            ? prev.map((a) => ({ ...a, isDefault: false }))
            : [...prev];
          next.push(address);
          return next;
        });
        toast.success("Address saved.");
      } else {
        const { address } = await updateAddress(editing, {
          ...form,
          isDefault: saveDefault,
        });
        setAddresses((prev) =>
          prev.map((a) => {
            if (a.id === address.id) return address;
            if (address.isDefault) return { ...a, isDefault: false };
            return a;
          })
        );
        toast.success("Address updated.");
      }
      closeForm();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not save the address.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this address?")) return;
    try {
      await deleteAddress(id);
      setAddresses((prev) => prev.filter((a) => a.id !== id));
      toast.success("Address removed.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not delete the address.");
    }
  };

  const setDefault = async (id) => {
    try {
      const { address } = await updateAddress(id, { isDefault: true });
      setAddresses((prev) =>
        prev.map((a) => ({
          ...a,
          isDefault: a.id === address.id,
        }))
      );
      toast.success("Default address updated.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not update default.");
    }
  };

  return (
    <ProfileLayout>
      <div className="ab-panel">
        <div className="ab-head">
          <div>
            <h1 className="ab-title">Address book</h1>
            <p className="ab-subtitle">
              Save addresses so checkout is one tap. The default address is used
              automatically the next time you place an order.
            </p>
          </div>
          {!editing ? (
            <button type="button" className="ab-btn-primary" onClick={openNew}>
              <Plus size={16} aria-hidden="true" />
              <span>Add address</span>
            </button>
          ) : null}
        </div>

        {error ? <p className="ab-error">{error}</p> : null}

        {editing ? (
          <section className="ab-form">
            <h2 className="ab-form-title">
              {editing === "new" ? "Add a new address" : "Edit address"}
            </h2>
            <div className="ab-form-grid">
              <label className="ab-field ab-field--full">
                Label
                <input
                  value={form.label}
                  onChange={update("label")}
                  placeholder="Home, Work, Mom's place"
                />
              </label>
              <label className="ab-field ab-field--full">
                Full name
                <input
                  value={form.fullName}
                  onChange={update("fullName")}
                  autoComplete="name"
                />
              </label>
              <label className="ab-field ab-field--full">
                Address line 1
                <input
                  value={form.line1}
                  onChange={update("line1")}
                  autoComplete="address-line1"
                />
              </label>
              <label className="ab-field ab-field--full">
                Address line 2 <span className="ab-field-opt">(optional)</span>
                <input
                  value={form.line2}
                  onChange={update("line2")}
                  autoComplete="address-line2"
                />
              </label>
              <label className="ab-field">
                City
                <input
                  value={form.city}
                  onChange={update("city")}
                  autoComplete="address-level2"
                />
              </label>
              <label className="ab-field">
                Postal code
                <input
                  value={form.postal}
                  onChange={update("postal")}
                  autoComplete="postal-code"
                />
              </label>
              <label className="ab-field ab-field--full">
                Phone <span className="ab-field-opt">(optional)</span>
                <input
                  value={form.phone}
                  onChange={update("phone")}
                  autoComplete="tel"
                />
              </label>
              <label className="ab-checkbox ab-field--full">
                <input
                  type="checkbox"
                  checked={saveDefault}
                  onChange={(e) => setSaveDefault(e.target.checked)}
                />
                Make this my default address
              </label>
            </div>
            <div className="ab-form-actions">
              <button
                type="button"
                className="ab-btn-secondary"
                onClick={closeForm}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                type="button"
                className="ab-btn-primary"
                onClick={submit}
                disabled={busy || !isValid(form)}
              >
                {busy ? "Saving…" : "Save address"}
              </button>
            </div>
          </section>
        ) : null}

        {loading ? (
          <p className="ab-empty">Loading your saved addresses…</p>
        ) : addresses.length === 0 && !editing ? (
          <div className="ab-empty-card">
            <p className="ab-empty">No addresses saved yet.</p>
            <button type="button" className="ab-btn-primary" onClick={openNew}>
              <Plus size={16} aria-hidden="true" />
              <span>Add your first address</span>
            </button>
          </div>
        ) : (
          <ul className="ab-list">
            {addresses.map((a) => (
              <li
                key={a.id}
                className={`ab-card${a.isDefault ? " ab-card--default" : ""}`}
              >
                <div className="ab-card-head">
                  <span className="ab-card-label">{a.label}</span>
                  {a.isDefault ? (
                    <span className="ab-card-default">Default</span>
                  ) : null}
                </div>
                <p className="ab-card-name">{a.fullName}</p>
                <p className="ab-card-line">{a.line1}</p>
                {a.line2 ? <p className="ab-card-line">{a.line2}</p> : null}
                <p className="ab-card-line">
                  {a.city}, {a.postal}
                </p>
                {a.phone ? <p className="ab-card-line">{a.phone}</p> : null}
                <div className="ab-card-actions">
                  {!a.isDefault ? (
                    <button
                      type="button"
                      className="ab-card-btn"
                      onClick={() => setDefault(a.id)}
                    >
                      <Star size={14} aria-hidden="true" />
                      <span>Set as default</span>
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="ab-card-btn"
                    onClick={() => openEdit(a)}
                  >
                    <Pencil size={14} aria-hidden="true" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    className="ab-card-btn ab-card-btn--danger"
                    onClick={() => remove(a.id)}
                  >
                    <Trash2 size={14} aria-hidden="true" />
                    <span>Delete</span>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </ProfileLayout>
  );
}
