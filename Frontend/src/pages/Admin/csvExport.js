/**
 * Tiny CSV-export utilities shared across admin tables.
 *
 * We intentionally avoid pulling in a heavy CSV library — Excel and Google
 * Sheets both accept the RFC 4180-ish format produced here (CRLF row
 * separators, doubled-quote escapes for embedded `"`, `,` and newlines).
 */

/**
 * Parse an RFC 4180-ish CSV string into a list of cell arrays.
 *
 * Supports:
 *  - quoted fields with embedded commas and newlines
 *  - doubled `""` quote escapes
 *  - both `\r\n` and `\n` line endings
 *  - empty trailing newline (ignored)
 *
 * Does NOT support exotic separators, BOM handling beyond a leading strip,
 * or row-aware error reporting — the wizard layers row-level validation on
 * top via the backend.
 */
export function parseCsv(text) {
  if (!text) return [];
  // Strip a leading UTF-8 BOM if present (Excel adds it on Windows).
  const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows = [];
  let cell = "";
  let row = [];
  let inQuotes = false;
  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    if (inQuotes) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ",") {
      row.push(cell);
      cell = "";
      continue;
    }
    if (ch === "\n" || ch === "\r") {
      row.push(cell);
      // Drop empty trailing lines but keep blank cells inside otherwise
      // populated rows. An empty row would have a single empty cell which
      // we skip below.
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
      cell = "";
      if (ch === "\r" && input[i + 1] === "\n") i += 1;
      continue;
    }
    cell += ch;
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    if (row.length > 1 || row[0] !== "") rows.push(row);
  }
  return rows;
}

/**
 * Convenience wrapper: parses CSV text into an array of objects keyed by
 * the header row. Lowercases the headers for case-insensitive matching
 * against the import schema. Throws if the file has no header row.
 */
export function parseCsvAsObjects(text) {
  const rows = parseCsv(text);
  if (rows.length === 0) return { header: [], records: [] };
  const header = rows[0].map((h) => String(h).trim());
  const lower = header.map((h) => h.toLowerCase());
  const records = rows.slice(1).map((cells, idx) => {
    const record = { __rowIndex: idx + 2 };
    for (let i = 0; i < lower.length; i += 1) {
      record[lower[i]] = cells[i] !== undefined ? cells[i].trim() : "";
    }
    return record;
  });
  return { header, records };
}

export function escapeCsv(value) {
  if (value == null) return "";
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Trigger a browser download with the given CSV text + filename. Shared
 * by all per-collection exporters so we have a single place that handles
 * blob lifecycle and DOM cleanup.
 */
export function downloadCsv(text, baseName) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `${baseName}-${stamp}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Build CSV text from a header array and a row-builder. Rows are joined
 * with CRLF for cross-platform compatibility (Excel on Windows refuses to
 * recognise LF-only files in some older locales).
 */
export function buildCsv({ header, rows, makeRow }) {
  const lines = [header.map(escapeCsv).join(",")];
  for (const row of rows) {
    const cells = makeRow(row).map(escapeCsv);
    lines.push(cells.join(","));
  }
  return lines.join("\r\n");
}

export function exportProductsCsv(rows) {
  const text = buildCsv({
    header: [
      "id",
      "title",
      "brand",
      "category",
      "searchKeywords",
      "price",
      "originalPrice",
      "stock",
      "rating",
      "reviewCount",
      "segments",
    ],
    rows,
    makeRow: (p) => [
      p.id,
      p.title,
      p.brand,
      p.category,
      Array.isArray(p.searchKeywords) ? p.searchKeywords.join(" | ") : "",
      Number(p.price || 0).toFixed(2),
      p.originalPrice ? Number(p.originalPrice).toFixed(2) : "",
      p.stock || 0,
      p.rating ?? "",
      p.reviewCount ?? "",
      Array.isArray(p.catalogSegments) ? p.catalogSegments.join(" | ") : "",
    ],
  });
  downloadCsv(text, "smartcart-products");
}

/**
 * Order summary CSV — one row per order with totals + customer + item
 * count. We deliberately collapse line items to a count rather than
 * exploding them (which would make per-order sorting in Excel awful);
 * a future "line-items export" can render the long form if needed.
 */
export function exportOrdersCsv(rows) {
  const text = buildCsv({
    header: [
      "id",
      "createdAt",
      "status",
      "customerEmail",
      "customerId",
      "itemCount",
      "subtotal",
      "discount",
      "shipping",
      "tax",
      "total",
      "couponCode",
    ],
    rows,
    makeRow: (o) => {
      const totals = o.totals || {};
      const itemCount = Array.isArray(o.items)
        ? o.items.reduce((sum, it) => sum + Number(it.quantity || 0), 0)
        : 0;
      return [
        o.id,
        o.createdAt || "",
        o.status || "processing",
        o.userEmail || "",
        o.userId || "",
        itemCount,
        Number(totals.subtotal || 0).toFixed(2),
        Number(totals.discount || 0).toFixed(2),
        Number(totals.shipping || 0).toFixed(2),
        Number(totals.tax || 0).toFixed(2),
        Number(totals.total || totals.grandTotal || 0).toFixed(2),
        o.couponCode || "",
      ];
    },
  });
  downloadCsv(text, "smartcart-orders");
}
