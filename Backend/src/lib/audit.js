/**
 * Audit log helpers — append-only event stream for every admin write.
 *
 * Each entry captures who did what to which resource, when, and a small
 * descriptive summary the admin UI can render directly. We keep the
 * payload deliberately compact (avoid storing entire product objects)
 * because the file db has no compaction story; once we move to MongoDB
 * the collection can index `actorId`, `action`, `ts` and gain a TTL.
 *
 * Entry shape:
 *   {
 *     id:       "log-<unix-ms>-<rand>",
 *     ts:       ISO timestamp,
 *     actorId:  user id of the admin (from req.user),
 *     actorEmail: cached email for display when the user is later renamed,
 *     action:   "product.create" | "product.update" | "product.delete"
 *             | "order.status"   | "order.bulk-status",
 *     target:   { type: "product" | "order", id: "<resource id>" },
 *     summary:  short human-readable string ("Created product Sony WH-1000XM5"),
 *     changes:  { field: { from, to } } | undefined,
 *     meta:     { ...action specific data } | undefined,
 *   }
 *
 * We trim the collection to MAX_AUDIT_ENTRIES on every append so a long-
 * running file db can't grow unbounded. The cap is generous (5,000) so
 * day-to-day operation never loses events; older entries get rotated out
 * once we cross it.
 */

const MAX_AUDIT_ENTRIES = 5000;

function randomShort() {
  return Math.random().toString(36).slice(2, 8);
}

function nowIso() {
  return new Date().toISOString();
}

/**
 * Append a single audit entry to the supplied db snapshot. Designed to be
 * called from inside a `withDb` mutator so the entry is written atomically
 * alongside the change it describes.
 *
 * Never throws — audit logging is best-effort and should never block the
 * primary mutation. We swallow shape errors with a console warn so a bad
 * call site is visible during dev but doesn't break the user request.
 */
function appendAudit(db, { actor, action, target, summary, changes, meta } = {}) {
  try {
    if (!Array.isArray(db.auditLogs)) db.auditLogs = [];
    const entry = {
      id: `log-${Date.now()}-${randomShort()}`,
      ts: nowIso(),
      actorId: actor?.id || actor?.userId || null,
      actorEmail: actor?.email || actor?.userEmail || null,
      action: String(action || "unknown"),
      target: target
        ? {
            type: String(target.type || "unknown"),
            id: target.id != null ? String(target.id) : null,
          }
        : null,
      summary: summary ? String(summary) : null,
      changes: changes && Object.keys(changes).length > 0 ? changes : undefined,
      meta: meta || undefined,
    };
    db.auditLogs.push(entry);

    // Cheap rotation — keep only the newest MAX entries to stop db.json
    // ballooning. We trim from the head (oldest first).
    if (db.auditLogs.length > MAX_AUDIT_ENTRIES) {
      const overflow = db.auditLogs.length - MAX_AUDIT_ENTRIES;
      db.auditLogs.splice(0, overflow);
    }
    return entry;
  } catch (err) {
    // Audit failures must never break the underlying mutation.
    // eslint-disable-next-line no-console
    console.warn("[audit] appendAudit failed:", err.message);
    return null;
  }
}

/**
 * Compute a small "changes" object from two snapshots of the same record,
 * skipping fields the admin UI doesn't care about. We don't dump every
 * differing field — long arrays (specs, images, catalogSegments) would
 * dominate the log without adding signal. Instead we record a coarse
 * "(array changed: <n> → <m> items)" marker.
 */
function diffShallow(before, after, fields) {
  const out = {};
  for (const key of fields) {
    const a = before ? before[key] : undefined;
    const b = after ? after[key] : undefined;
    if (Array.isArray(a) || Array.isArray(b)) {
      const al = Array.isArray(a) ? a.length : 0;
      const bl = Array.isArray(b) ? b.length : 0;
      if (al !== bl) out[key] = { from: `${al} item(s)`, to: `${bl} item(s)` };
      continue;
    }
    if (a !== b && !(a == null && b == null)) {
      out[key] = { from: a ?? null, to: b ?? null };
    }
  }
  return out;
}

const PRODUCT_TRACK_FIELDS = [
  "title",
  "brand",
  "category",
  "price",
  "originalPrice",
  "stock",
  "rating",
  "reviewCount",
  "image",
  "images",
  "catalogSegments",
  "description",
];

module.exports = {
  appendAudit,
  diffShallow,
  PRODUCT_TRACK_FIELDS,
};
