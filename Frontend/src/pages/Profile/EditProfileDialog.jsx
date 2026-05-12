import { useEffect, useRef, useState } from "react";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import "./EditProfileDialog.css";

/**
 * "Edit Details" modal for the Profile page. Today only the user's display
 * name is editable (the email field is shown read-only because changing it
 * needs a verification flow we haven't built yet). Submitting calls the
 * `onSubmit` prop, which is expected to call `PATCH /api/auth/me` and
 * resolve with the updated user.
 *
 * The form lives in a child component (`DialogBody`) so its state is
 * initialised once per open via `useState` initializer rather than via an
 * effect — this matches the React-19 react-hooks lint rule that bans
 * `setState` calls inside effects when a derived initial value would do.
 */
export default function EditProfileDialog({ open, user, onClose, onSubmit }) {
  if (!open) return null;
  return <DialogBody user={user} onClose={onClose} onSubmit={onSubmit} />;
}

function DialogBody({ user, onClose, onSubmit }) {
  const [name, setName] = useState(() => user?.name || "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);
  const dialogRef = useRef(null);
  useFocusTrap(dialogRef, true);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      clearTimeout(t);
    };
  }, [onClose]);

  const trimmed = name.trim();
  const unchanged = trimmed === (user?.name || "").trim();
  const tooShort = trimmed.length < 2;
  const disabled = submitting || tooShort || unchanged;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (disabled) return;
    setSubmitting(true);
    setError("");
    try {
      await onSubmit({ name: trimmed });
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Could not update your details");
      setSubmitting(false);
    }
  };

  return (
    <div className="epd-overlay" role="presentation" onClick={onClose}>
      <div
        ref={dialogRef}
        className="epd-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="epd-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="epd-head">
          <h2 id="epd-title" className="epd-title">Edit Personal Details</h2>
          <button
            type="button"
            className="epd-close"
            onClick={onClose}
            aria-label="Close dialog"
          >
            ×
          </button>
        </header>

        <form className="epd-form" onSubmit={handleSubmit} noValidate>
          <label className="epd-field">
            <span className="epd-label">Full Name</span>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              autoComplete="name"
              required
            />
          </label>

          <label className="epd-field">
            <span className="epd-label">Email Address</span>
            <input type="email" value={user?.email || ""} disabled readOnly />
            <small className="epd-hint">
              Email changes will be supported soon.
            </small>
          </label>

          {error ? <p className="epd-error" role="alert">{error}</p> : null}

          <div className="epd-actions">
            <button
              type="button"
              className="epd-btn epd-btn--ghost"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="epd-btn epd-btn--primary"
              disabled={disabled}
            >
              {submitting ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
