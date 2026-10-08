"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getSessionToken } from "@/lib/session";
import styles from "./suggestions.module.css";

type SuggestionStatus = "new" | "reviewing" | "planned" | "completed" | "ignored";
type SuggestionCategory = "new_idea" | "broken" | "easier" | "other";
type Suggestion = {
  suggestion_id: string;
  user_id: string | number;
  user?: string;
  email?: string | null;
  category: SuggestionCategory;
  message: string;
  status: SuggestionStatus;
  current_path?: string | null;
  device_metadata?: Record<string, unknown> | null;
  created_at: string;
  updated_at?: string;
};
type Summary = Record<"total" | SuggestionStatus, number>;

const CATEGORY_LABELS: Record<SuggestionCategory, string> = {
  new_idea: "💡 New idea",
  broken: "🐞 Something’s broken",
  easier: "🙌 Make it easier",
  other: "💬 Something else",
};
const STATUS_LABELS: Record<SuggestionStatus, string> = {
  new: "New",
  reviewing: "Reviewing",
  planned: "Planned",
  completed: "Completed",
  ignored: "Ignored",
};
const EMPTY_SUMMARY: Summary = { total: 0, new: 0, reviewing: 0, planned: 0, completed: 0, ignored: 0 };

function toSummary(value: any): Summary {
  return {
    total: Number(value?.total || 0), new: Number(value?.new || 0), reviewing: Number(value?.reviewing || 0),
    planned: Number(value?.planned || 0), completed: Number(value?.completed || 0), ignored: Number(value?.ignored || 0),
  };
}
function when(value?: string) {
  return value ? new Date(value).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" }) : "—";
}
function statusClass(status: SuggestionStatus) {
  return `${styles.status} ${styles[`status_${status}`] || ""}`;
}

export default function AdminSuggestions() {
  const [rows, setRows] = useState<Suggestion[]>([]);
  const [summary, setSummary] = useState<Summary>(EMPTY_SUMMARY);
  const [filteredTotal, setFilteredTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Suggestion | null>(null);
  const [updating, setUpdating] = useState(false);

  const load = useCallback(async () => {
    const token = getSessionToken();
    if (!token) { setError("Admin session required."); setLoading(false); return; }
    setLoading(true);
    setError("");
    try {
      const result: any = await api.admin.suggestions(token, { search: search.trim(), category, status, sort, page: 1, limit: 100 });
      const nextRows = Array.isArray(result?.suggestions) ? result.suggestions : [];
      setRows(nextRows);
      setSummary(toSummary(result?.summary));
      setFilteredTotal(Number(result?.total_filtered || 0));
      setSelected((current) => current ? nextRows.find((row: Suggestion) => row.suggestion_id === current.suggestion_id) || current : null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load suggestions.");
    } finally {
      setLoading(false);
    }
  }, [search, category, status, sort]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 280);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if (!selected) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const close = (event: KeyboardEvent) => { if (event.key === "Escape" && !updating) setSelected(null); };
    window.addEventListener("keydown", close);
    return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", close); };
  }, [selected, updating]);

  async function changeStatus(nextStatus: SuggestionStatus) {
    if (!selected || updating || selected.status === nextStatus) return;
    const token = getSessionToken();
    if (!token) return;
    setUpdating(true);
    setError("");
    try {
      await api.admin.suggestionStatus(token, selected.suggestion_id, nextStatus);
      setSelected((current) => current ? { ...current, status: nextStatus } : current);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update this suggestion.");
    } finally {
      setUpdating(false);
    }
  }

  const cards: Array<[keyof Summary, string]> = [
    ["total", "Total suggestions"], ["new", "New"], ["reviewing", "Reviewing"], ["planned", "Planned"], ["completed", "Completed"], ["ignored", "Ignored"],
  ];

  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <header className={styles.header}>
          <Link href="/admin/menu" aria-label="Back to admin menu">‹</Link>
          <div><h1>Suggestions</h1><p>Read customer ideas, issues and improvement requests</p></div>
        </header>

        <section className={styles.summary} aria-label="Suggestion totals">
          {cards.map(([key, label]) => <article key={key}><strong>{summary[key].toLocaleString("en-NG")}</strong><span>{label}</span></article>)}
        </section>

        <section className={styles.filters}>
          <label className={styles.search}><span>Search</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Message, email, user or suggestion ID" /></label>
          <label><span>Category</span><select value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">All categories</option><option value="new_idea">New idea</option><option value="broken">Something’s broken</option><option value="easier">Make it easier</option><option value="other">Something else</option></select></label>
          <label><span>Status</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All statuses</option>{Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label><span>Sort</span><select value={sort} onChange={(event) => setSort(event.target.value as "newest" | "oldest")}><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></label>
        </section>

        <div className={styles.resultBar}><span>{filteredTotal.toLocaleString("en-NG")} result{filteredTotal === 1 ? "" : "s"}</span>{loading && <b>Refreshing…</b>}</div>
        {error && <div className={styles.error} role="alert">{error} <button type="button" onClick={() => void load()}>Retry</button></div>}

        <section className={styles.list}>
          {rows.map((item) => (
            <article className={styles.row} key={item.suggestion_id}>
              <div className={styles.rowTop}><span className={styles.category}>{CATEGORY_LABELS[item.category] || item.category}</span><span className={statusClass(item.status)}>{STATUS_LABELS[item.status] || item.status}</span></div>
              <p>{item.message}</p>
              <div className={styles.rowMeta}><span><b>{item.user || "WickSpend User"}</b>{item.email ? ` · ${item.email}` : ` · User #${item.user_id}`}</span><time>{when(item.created_at)}</time></div>
              <button type="button" className={styles.openButton} onClick={() => setSelected(item)}>Open suggestion</button>
            </article>
          ))}
          {!loading && rows.length === 0 && <div className={styles.empty}>No suggestions match these filters.</div>}
          {loading && rows.length === 0 && <div className={styles.empty}>Loading suggestions…</div>}
        </section>
      </section>

      {selected && (
        <div className={styles.backdrop} onMouseDown={(event) => { if (event.target === event.currentTarget && !updating) setSelected(null); }}>
          <section className={styles.detail} role="dialog" aria-modal="true" aria-labelledby="suggestion-detail-title">
            <header className={styles.detailHeader}><div><small>SUGGESTION</small><h2 id="suggestion-detail-title">{selected.suggestion_id}</h2></div><button type="button" onClick={() => setSelected(null)} disabled={updating} aria-label="Close">×</button></header>
            <div className={styles.detailBadges}><span className={styles.category}>{CATEGORY_LABELS[selected.category]}</span><span className={statusClass(selected.status)}>{STATUS_LABELS[selected.status]}</span></div>
            <div className={styles.messageBox}>{selected.message}</div>
            <dl className={styles.detailsGrid}>
              <div><dt>User</dt><dd>{selected.user || "WickSpend User"}</dd></div>
              <div><dt>Email</dt><dd>{selected.email || "—"}</dd></div>
              <div><dt>User ID</dt><dd>{selected.user_id}</dd></div>
              <div><dt>Submitted</dt><dd>{when(selected.created_at)}</dd></div>
              <div><dt>Page</dt><dd>{selected.current_path || "—"}</dd></div>
              <div><dt>Device</dt><dd>{String(selected.device_metadata?.platform || selected.device_metadata?.viewport || "—")}</dd></div>
            </dl>
            <label className={styles.statusControl}><span>Status</span><select value={selected.status} onChange={(event) => void changeStatus(event.target.value as SuggestionStatus)} disabled={updating}>{Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            {Boolean(selected.device_metadata?.user_agent) && <details className={styles.device}><summary>Device details</summary><p>{String(selected.device_metadata?.user_agent)}</p>{Boolean(selected.device_metadata?.viewport) && <small>Viewport: {String(selected.device_metadata?.viewport)}</small>}</details>}
            <p className={styles.auditNote}>{updating ? "Updating status…" : "Status changes are recorded in the existing WickSpend admin audit log."}</p>
          </section>
        </div>
      )}
    </main>
  );
}
