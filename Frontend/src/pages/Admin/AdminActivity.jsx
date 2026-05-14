import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Activity as ActivityIcon,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Filter,
  Inbox,
  Package,
  ShoppingCart,
  Trash2,
  UserRound,
} from "lucide-react";
import AdminLayout from "./AdminLayout";
import AdmDropdown from "../../components/AdmDropdown";
import { adminListAuditLogs } from "../../api/client";
import usePageMeta from "../../hooks/usePageMeta";
import "./AdminActivity.css";

/**
 * Action → display metadata. Drives the row icon, tone, and the
 * sidebar/filter labels. Centralised here so future actions only need
 * one entry to be first-class.
 */
const ACTION_META = {
  "product.create": {
    label: "Product created",
    icon: Package,
    tone: "create",
    targetPath: (e) => (e.target?.id ? `/admin/inventory?q=${encodeURIComponent(e.target.id)}` : null),
  },
  "product.update": {
    label: "Product updated",
    icon: Package,
    tone: "update",
    targetPath: (e) => (e.target?.id ? `/admin/inventory?q=${encodeURIComponent(e.target.id)}` : null),
  },
  "product.delete": {
    label: "Product deleted",
    icon: Trash2,
    tone: "danger",
    targetPath: () => null,
  },
  "order.status": {
    label: "Order status changed",
    icon: ShoppingCart,
    tone: "update",
    targetPath: (e) => (e.target?.id ? `/admin/orders?focus=${encodeURIComponent(e.target.id)}` : null),
  },
  "order.bulk-status": {
    label: "Bulk order status update",
    icon: ShoppingCart,
    tone: "update",
    targetPath: () => "/admin/orders",
  },
};

const ACTION_FILTER_OPTIONS = [
  { value: "", label: "All actions" },
  { value: "product", label: "Products" },
  { value: "order", label: "Orders" },
  { value: "create", label: "Created" },
  { value: "update", label: "Updated" },
  { value: "delete", label: "Deleted" },
];

const RANGE_OPTIONS = [
  { value: "all", label: "All time" },
  { value: "1", label: "Last 24 hours" },
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
];

const PAGE_SIZE_OPTIONS = [
  { value: "25", label: "25 / page" },
  { value: "50", label: "50 / page" },
  { value: "100", label: "100 / page" },
];

function formatRelative(iso) {
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

function formatAbsolute(iso) {
  const ts = Date.parse(iso);
  if (!ts) return "";
  return new Date(ts).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/* Render a small inline diff for a `changes` map ({ field: { from, to } }).
 * We keep it deliberately compact — long values get truncated and arrays
 * are already summarised on the backend (e.g. "3 item(s)" → "5 item(s)"). */
function ChangeBadges({ changes }) {
  if (!changes || Object.keys(changes).length === 0) return null;
  return (
    <ul className="aa-changes" aria-label="Field changes">
      {Object.entries(changes).map(([field, diff]) => (
        <li key={field}>
          <strong>{field}</strong>
          <span className="aa-from">{formatValue(diff?.from)}</span>
          <ArrowRight size={11} aria-hidden="true" />
          <span className="aa-to">{formatValue(diff?.to)}</span>
        </li>
      ))}
    </ul>
  );
}

function formatValue(v) {
  if (v == null || v === "") return "—";
  const s = String(v);
  return s.length > 60 ? `${s.slice(0, 57)}…` : s;
}

export default function AdminActivity() {
  usePageMeta({
    title: "Admin Activity",
    description: "Audit trail of every admin action in SmartCart.",
  });

  const [searchParams, setSearchParams] = useSearchParams();
  const [entries, setEntries] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filter state is mirrored into the URL so deep-links / browser back
  // preserve the admin's view.
  const [actionFilter, setActionFilter] = useState(
    searchParams.get("action") || ""
  );
  const [range, setRange] = useState(searchParams.get("range") || "all");
  const [actorQuery, setActorQuery] = useState(searchParams.get("actor") || "");
  const [textQuery, setTextQuery] = useState(searchParams.get("q") || "");
  const [page, setPage] = useState(
    Math.max(1, parseInt(searchParams.get("page") || "1", 10))
  );
  const [pageSize, setPageSize] = useState(
    parseInt(searchParams.get("size") || "25", 10) || 25
  );

  const fetchParams = useMemo(() => {
    const params = { limit: pageSize, offset: (page - 1) * pageSize };
    if (actionFilter) params.action = actionFilter;
    if (actorQuery.trim()) params.actor = actorQuery.trim();
    if (textQuery.trim()) params.q = textQuery.trim();
    if (range !== "all") {
      const days = Number(range);
      if (Number.isFinite(days)) {
        params.since = new Date(Date.now() - days * 86400000).toISOString();
      }
    }
    return params;
  }, [actionFilter, range, actorQuery, textQuery, page, pageSize]);

  // Reset to page 1 whenever any filter changes so we don't end up on a
  // page that no longer exists.
  useEffect(() => {
    setPage(1);
  }, [actionFilter, range, actorQuery, textQuery, pageSize]);

  // Sync filter state → URL.
  useEffect(() => {
    const next = new URLSearchParams();
    if (actionFilter) next.set("action", actionFilter);
    if (range && range !== "all") next.set("range", range);
    if (actorQuery.trim()) next.set("actor", actorQuery.trim());
    if (textQuery.trim()) next.set("q", textQuery.trim());
    if (page !== 1) next.set("page", String(page));
    if (pageSize !== 25) next.set("size", String(pageSize));
    setSearchParams(next, { replace: true });
  }, [actionFilter, range, actorQuery, textQuery, page, pageSize, setSearchParams]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    (async () => {
      try {
        const data = await adminListAuditLogs(fetchParams);
        if (cancelled) return;
        setEntries(data.entries || []);
        setTotal(data.total || 0);
      } catch (err) {
        if (cancelled) return;
        setError(err.response?.data?.message || "Couldn't load activity feed.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchParams]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);

  const clearFilters = () => {
    setActionFilter("");
    setRange("all");
    setActorQuery("");
    setTextQuery("");
  };

  const hasActiveFilters =
    actionFilter || range !== "all" || actorQuery.trim() || textQuery.trim();

  return (
    <AdminLayout
      title="Activity"
      subtitle="Audit trail of every admin write — products, orders and bulk actions."
      actions={
        <>
          <AdmDropdown
            value={range}
            options={RANGE_OPTIONS}
            onChange={setRange}
            ariaLabel="Filter activity by date range"
          />
          {hasActiveFilters ? (
            <button
              type="button"
              className="adm-btn adm-btn-ghost"
              onClick={clearFilters}
              title="Clear all filters"
            >
              Clear filters
            </button>
          ) : null}
        </>
      }
    >
      <section className="adm-card aa-card">
        <header className="aa-toolbar">
          <div className="aa-search">
            <Filter size={14} aria-hidden="true" />
            <input
              type="search"
              placeholder="Search summary, action or target id…"
              value={textQuery}
              onChange={(e) => setTextQuery(e.target.value)}
              aria-label="Search activity feed"
            />
          </div>
          <div className="aa-actor-search">
            <UserRound size={14} aria-hidden="true" />
            <input
              type="search"
              placeholder="Filter by actor email"
              value={actorQuery}
              onChange={(e) => setActorQuery(e.target.value)}
              aria-label="Filter by actor email"
            />
          </div>
          <AdmDropdown
            value={actionFilter}
            options={ACTION_FILTER_OPTIONS}
            onChange={setActionFilter}
            ariaLabel="Filter by action type"
          />
        </header>

        {error ? (
          <p className="aa-error" role="alert">
            {error}
          </p>
        ) : null}

        {loading ? (
          <ul className="aa-list aa-list--loading">
            {Array.from({ length: 6 }).map((_, i) => (
              <li key={`sk-${i}`} className="aa-row aa-row--skel">
                <span className="adm-skel adm-skel-thumb" />
                <span className="adm-skel-stack">
                  <span
                    className="adm-skel adm-skel-line adm-skel-line--lg"
                    style={{ width: "55%" }}
                  />
                  <span
                    className="adm-skel adm-skel-line adm-skel-line--sm"
                    style={{ width: "30%" }}
                  />
                </span>
              </li>
            ))}
          </ul>
        ) : entries.length === 0 ? (
          <div className="adm-empty-state">
            <span className="adm-empty-icon">
              <Inbox size={26} aria-hidden="true" />
            </span>
            <h3 className="adm-empty-title">
              {total === 0 && !hasActiveFilters
                ? "No admin activity yet"
                : "No activity matches your filters"}
            </h3>
            <p className="adm-empty-text">
              {total === 0 && !hasActiveFilters
                ? "Every product change, order status update and bulk action will appear here once admins start making changes."
                : "Try widening the date range or clearing some filters."}
            </p>
            {hasActiveFilters ? (
              <div className="adm-empty-actions">
                <button
                  type="button"
                  className="adm-btn adm-btn-primary"
                  onClick={clearFilters}
                >
                  Clear filters
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <ul className="aa-list" aria-label="Audit log entries">
            {entries.map((entry) => {
              const meta = ACTION_META[entry.action] || {
                label: entry.action || "Activity",
                icon: ActivityIcon,
                tone: "update",
                targetPath: () => null,
              };
              const Icon = meta.icon;
              const targetPath = meta.targetPath(entry);
              return (
                <li
                  key={entry.id}
                  className={`aa-row aa-row--${meta.tone}`}
                >
                  <span className="aa-icon" aria-hidden="true">
                    <Icon size={16} />
                  </span>
                  <div className="aa-body">
                    <p className="aa-summary">
                      <strong>{entry.summary || meta.label}</strong>
                      <span className="aa-action-tag">{entry.action}</span>
                    </p>
                    <p className="aa-meta">
                      <span title={formatAbsolute(entry.ts)}>
                        {formatRelative(entry.ts)}
                      </span>
                      <span aria-hidden="true">•</span>
                      <span>{entry.actorEmail || entry.actorId || "system"}</span>
                      {entry.target?.id ? (
                        <>
                          <span aria-hidden="true">•</span>
                          <code className="aa-target">{entry.target.id}</code>
                        </>
                      ) : null}
                    </p>
                    <ChangeBadges changes={entry.changes} />
                  </div>
                  {targetPath ? (
                    <Link
                      to={targetPath}
                      className="aa-jump"
                      title="Open related record"
                      aria-label="Open related record"
                    >
                      <ArrowRight size={14} aria-hidden="true" />
                    </Link>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}

        {!loading && entries.length > 0 ? (
          <div className="adm-pagination aa-pagination">
            <div className="adm-pagination-info">
              <span>
                Showing {(safePage - 1) * pageSize + 1}–
                {Math.min(safePage * pageSize, total)} of {total}
              </span>
              <AdmDropdown
                value={String(pageSize)}
                options={PAGE_SIZE_OPTIONS}
                onChange={(v) => setPageSize(Number(v) || 25)}
                ariaLabel="Entries per page"
              />
            </div>
            <div className="adm-pagination-buttons">
              <button
                type="button"
                className="adm-pager-btn"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                aria-label="Previous page"
              >
                <ChevronLeft size={14} aria-hidden="true" />
              </button>
              <span className="adm-pagination-pages">
                Page {safePage} of {totalPages}
              </span>
              <button
                type="button"
                className="adm-pager-btn"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                aria-label="Next page"
              >
                <ChevronRight size={14} aria-hidden="true" />
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </AdminLayout>
  );
}
