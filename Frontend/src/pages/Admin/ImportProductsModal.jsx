import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileText,
  Upload,
  X,
} from "lucide-react";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import { adminBulkImportProducts } from "../../api/client";
import { downloadCsv, parseCsvAsObjects } from "./csvExport";
import "./ImportProductsModal.css";

/**
 * Expected CSV column headers. Mirrors the export schema in `csvExport.js`
 * so admins can round-trip "Export CSV → edit in Excel → Import CSV". We
 * accept extra columns silently (they're ignored) and we only require
 * `title`, `category` and `price`; everything else is optional and falls
 * back to the server defaults in `POST /admin/products/bulk-import`.
 */
const REQUIRED_COLUMNS = ["title", "category", "price"];
const SAMPLE_HEADERS = [
  "title",
  "brand",
  "category",
  "description",
  "price",
  "originalPrice",
  "stock",
  "image",
  "images",
  "segments",
  "rating",
  "reviewCount",
];

/**
 * Map a parsed CSV record into the shape the backend `bulk-import`
 * endpoint expects. Mostly identity, with two small normalisations:
 *  - `segments` (a `|`-separated list in our export) → `catalogSegments[]`
 *  - `images` (a `|`-separated list) → `images[]`
 *
 * Numbers are left as strings; the backend's `safeNumber` helper coerces
 * them, which keeps the parser dumb and predictable.
 */
function recordToProductPayload(record) {
  const out = {};
  for (const [key, value] of Object.entries(record)) {
    if (key.startsWith("__")) continue;
    if (value === "" || value === null || value === undefined) continue;
    if (key === "segments") {
      out.catalogSegments = String(value)
        .split("|")
        .map((s) => s.trim())
        .filter(Boolean);
      continue;
    }
    if (key === "images") {
      out.images = String(value)
        .split("|")
        .map((s) => s.trim())
        .filter(Boolean);
      continue;
    }
    out[key] = value;
  }
  return out;
}

function downloadTemplate() {
  const sampleRows = [
    [
      "Nebula Wireless Headphones",
      "Nebula",
      "Audio",
      "Premium over-ear wireless headphones with ANC.",
      "199.99",
      "249.99",
      "25",
      "https://example.com/nebula.jpg",
      "https://example.com/nebula.jpg|https://example.com/nebula-2.jpg",
      "AI Picks|Audio",
      "4.7",
      "152",
    ],
  ];
  const lines = [SAMPLE_HEADERS.join(",")];
  for (const row of sampleRows) {
    lines.push(row.map((v) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)).join(","));
  }
  downloadCsv(lines.join("\r\n"), "smartcart-import-template");
}

export default function ImportProductsModal({ open, onClose, onImported, toast }) {
  const ref = useRef(null);
  useFocusTrap(ref, open);

  // step: "pick" (no file yet) | "preview" (parsed + dry-run) | "done"
  const [step, setStep] = useState("pick");
  const [filename, setFilename] = useState("");
  const [parseError, setParseError] = useState("");
  const [headers, setHeaders] = useState([]);
  const [records, setRecords] = useState([]);
  const [dryRunResult, setDryRunResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [committed, setCommitted] = useState(null);
  const [dropActive, setDropActive] = useState(false);
  const fileInputRef = useRef(null);

  // Reset state every time the modal opens so reopening after a previous
  // import starts at a clean "pick a file" step.
  useEffect(() => {
    if (!open) return;
    setStep("pick");
    setFilename("");
    setParseError("");
    setHeaders([]);
    setRecords([]);
    setDryRunResult(null);
    setBusy(false);
    setCommitted(null);
    setDropActive(false);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onClose]);

  const missingColumns = useMemo(() => {
    if (headers.length === 0) return [];
    const lower = headers.map((h) => h.toLowerCase());
    return REQUIRED_COLUMNS.filter((req) => !lower.includes(req));
  }, [headers]);

  const handleFile = async (file) => {
    if (!file) return;
    setFilename(file.name);
    setParseError("");
    setDryRunResult(null);
    try {
      const text = await file.text();
      const { header, records: parsed } = parseCsvAsObjects(text);
      if (parsed.length === 0) {
        setParseError("That file has no data rows.");
        setHeaders([]);
        setRecords([]);
        return;
      }
      setHeaders(header);
      setRecords(parsed);
      // Auto-run a dry-run against the backend so the preview shows
      // validation hints immediately. We don't block the user — they can
      // still click Import even if some rows fail; only valid rows commit.
      setBusy(true);
      try {
        const result = await adminBulkImportProducts(
          parsed.map(recordToProductPayload),
          { dryRun: true }
        );
        setDryRunResult(result);
        setStep("preview");
      } catch (err) {
        setParseError(err.response?.data?.message || "Validation failed.");
      } finally {
        setBusy(false);
      }
    } catch {
      setParseError("Couldn't read that file. Make sure it's plain CSV.");
    }
  };

  const handleCommit = async () => {
    if (records.length === 0) return;
    setBusy(true);
    try {
      const result = await adminBulkImportProducts(
        records.map(recordToProductPayload),
        { dryRun: false }
      );
      setCommitted(result);
      setStep("done");
      const createdProducts = (result.results || [])
        .filter((r) => r.ok && r.product)
        .map((r) => r.product);
      if (createdProducts.length > 0 && typeof onImported === "function") {
        onImported(createdProducts);
      }
      toast?.success?.(
        `Imported ${result.summary.created} product${result.summary.created === 1 ? "" : "s"}`
      );
    } catch (err) {
      toast?.error?.(err.response?.data?.message || "Import failed.");
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div className="ai-dialog-overlay" role="presentation" onClick={busy ? undefined : onClose}>
      <div
        ref={ref}
        className="ai-dialog ai-import-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-import-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="ai-dialog-head">
          <div>
            <h2 id="ai-import-title">Import products from CSV</h2>
            <p>
              Upload a CSV exported from this console or built from the
              template below. We&apos;ll validate every row first, then commit on
              your approval.
            </p>
          </div>
          <button
            type="button"
            className="ai-dialog-close"
            onClick={onClose}
            disabled={busy}
            aria-label="Close import"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <div className="ai-import-body">
          {step === "pick" ? (
            <div
              className={
                "ai-import-drop" + (dropActive ? " ai-import-drop--active" : "")
              }
              onDragOver={(e) => {
                e.preventDefault();
                setDropActive(true);
              }}
              onDragLeave={() => setDropActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDropActive(false);
                const file = e.dataTransfer.files?.[0];
                if (file) handleFile(file);
              }}
            >
              <Upload size={28} aria-hidden="true" />
              <strong>Drop your CSV here</strong>
              <p>
                or{" "}
                <button
                  type="button"
                  className="ai-import-pick"
                  onClick={() => fileInputRef.current?.click()}
                >
                  browse your computer
                </button>
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                  // Reset so the same file can be re-picked after a fail.
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                className="adm-btn adm-btn-ghost ai-import-template"
                onClick={downloadTemplate}
              >
                <Download size={14} aria-hidden="true" />
                Download CSV template
              </button>
              {parseError ? (
                <p className="ai-import-error" role="alert">
                  {parseError}
                </p>
              ) : null}
            </div>
          ) : null}

          {step === "preview" && dryRunResult ? (
            <ImportPreview
              filename={filename}
              records={records}
              dryRunResult={dryRunResult}
              missingColumns={missingColumns}
              onChooseAnother={() => setStep("pick")}
            />
          ) : null}

          {step === "done" && committed ? (
            <ImportDone summary={committed.summary} />
          ) : null}
        </div>

        <footer className="ai-dialog-foot">
          {step === "pick" ? (
            <button
              type="button"
              className="adm-btn adm-btn-ghost"
              onClick={onClose}
            >
              Cancel
            </button>
          ) : null}

          {step === "preview" ? (
            <>
              <button
                type="button"
                className="adm-btn adm-btn-ghost"
                onClick={() => setStep("pick")}
                disabled={busy}
              >
                Choose another file
              </button>
              <button
                type="button"
                className="adm-btn adm-btn-primary"
                onClick={handleCommit}
                disabled={
                  busy ||
                  !dryRunResult?.summary?.valid ||
                  missingColumns.length > 0
                }
                title={
                  missingColumns.length > 0
                    ? `Missing required columns: ${missingColumns.join(", ")}`
                    : undefined
                }
              >
                {busy
                  ? "Importing…"
                  : `Import ${dryRunResult?.summary?.valid || 0} row${dryRunResult?.summary?.valid === 1 ? "" : "s"}`}
              </button>
            </>
          ) : null}

          {step === "done" ? (
            <button
              type="button"
              className="adm-btn adm-btn-primary"
              onClick={onClose}
            >
              Done
            </button>
          ) : null}
        </footer>
      </div>
    </div>
  );
}

function ImportPreview({
  filename,
  records,
  dryRunResult,
  missingColumns,
  onChooseAnother,
}) {
  const results = dryRunResult?.results || [];
  const errorRows = results.filter((r) => !r.ok);
  const validRows = results.filter((r) => r.ok);

  return (
    <div className="ai-import-preview">
      <div className="ai-import-summary">
        <span className="ai-import-summary-file" title={filename}>
          <FileText size={14} aria-hidden="true" />
          {filename}
        </span>
        <div className="ai-import-summary-stats">
          <span className="ai-import-stat ai-import-stat--ok">
            <CheckCircle2 size={13} aria-hidden="true" />
            {validRows.length} valid
          </span>
          {errorRows.length > 0 ? (
            <span className="ai-import-stat ai-import-stat--bad">
              <AlertTriangle size={13} aria-hidden="true" />
              {errorRows.length} with errors
            </span>
          ) : null}
          <span className="ai-import-stat ai-import-stat--muted">
            {records.length} total
          </span>
        </div>
        <button
          type="button"
          className="adm-btn-ghost ai-import-replace"
          onClick={onChooseAnother}
        >
          Replace file
        </button>
      </div>

      {missingColumns.length > 0 ? (
        <p className="ai-import-warning" role="alert">
          <AlertTriangle size={14} aria-hidden="true" />
          Missing required columns: <strong>{missingColumns.join(", ")}</strong>. Fix the
          header row and re-upload.
        </p>
      ) : null}

      <div className="ai-import-table-wrap">
        <table className="ai-import-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Title</th>
              <th>Brand</th>
              <th>Category</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r, idx) => {
              const result = results.find((res) => res.rowIndex === idx) || {};
              const ok = result.ok !== false;
              return (
                <tr key={idx} className={ok ? "" : "ai-import-row--error"}>
                  <td>{r.__rowIndex}</td>
                  <td>{r.title || <span className="ai-import-empty">—</span>}</td>
                  <td>{r.brand || <span className="ai-import-empty">—</span>}</td>
                  <td>{r.category || <span className="ai-import-empty">—</span>}</td>
                  <td>{r.price || <span className="ai-import-empty">—</span>}</td>
                  <td>{r.stock || "0"}</td>
                  <td>
                    {ok ? (
                      <span className="ai-import-status ai-import-status--ok">
                        <CheckCircle2 size={12} aria-hidden="true" />
                        Ready
                      </span>
                    ) : (
                      <span
                        className="ai-import-status ai-import-status--bad"
                        title={result.errors?.join("\n")}
                      >
                        <AlertTriangle size={12} aria-hidden="true" />
                        {result.errors?.[0] || "Error"}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ImportDone({ summary }) {
  return (
    <div className="ai-import-done">
      <span className="ai-import-done-icon" aria-hidden="true">
        <CheckCircle2 size={36} />
      </span>
      <h3>Import complete</h3>
      <p>
        Created <strong>{summary.created}</strong> product{summary.created === 1 ? "" : "s"}.
        {summary.failed > 0
          ? ` ${summary.failed} row${summary.failed === 1 ? " was" : "s were"} skipped due to validation errors.`
          : ""}
      </p>
      <p className="ai-import-done-hint">
        New products are now visible in the inventory table.
      </p>
    </div>
  );
}
