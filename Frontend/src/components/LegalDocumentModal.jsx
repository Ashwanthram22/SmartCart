import { useEffect, useRef } from "react";
import { LEGAL_DOCUMENTS } from "../content/legalDocuments";
import { useFocusTrap } from "../hooks/useFocusTrap";
import "./LegalDocumentModal.css";

/**
 * Scrollable document modal (terms, privacy, footer pages, etc.).
 *
 * @param {{
 *   open: boolean,
 *   documentId: string | null,
 *   onClose: () => void,
 *   documents?: Record<string, { title: string, lastUpdated: string, paragraphs: string[] }>,
 * }} props
 */
export default function LegalDocumentModal({
  open,
  documentId,
  onClose,
  documents = LEGAL_DOCUMENTS,
}) {
  const doc = documentId && documents[documentId] ? documents[documentId] : null;
  const dialogRef = useRef(null);
  useFocusTrap(dialogRef, open && Boolean(doc));

  useEffect(() => {
    if (!open || !doc) return undefined;

    function onKeyDown(event) {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose?.();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, doc, onClose]);

  if (!open || !doc) return null;

  const handleBackdropClick = (event) => {
    if (event.target === event.currentTarget) onClose?.();
  };

  return (
    <div
      className="legal-modal-backdrop"
      role="presentation"
      onClick={handleBackdropClick}
    >
      <div
        ref={dialogRef}
        className="legal-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="legal-modal-title"
      >
        <header className="legal-modal-head">
          <div>
            <h2 id="legal-modal-title" className="legal-modal-title">
              {doc.title}
            </h2>
            <p className="legal-modal-updated">Last updated: {doc.lastUpdated}</p>
          </div>
          <button
            type="button"
            className="legal-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </header>
        <div className="legal-modal-body">
          {doc.paragraphs.map((text, i) => (
            <p key={i}>{text}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
