import React, { useEffect, useState } from "react";
import { ClipboardCopy, FilePenLine, RefreshCcw, ShieldCheck } from "lucide-react";

type InternalDraft = {
  id: string; title: string; brief: string; status: "DRAFT";
  createdAt: string; createdBy: string;
};

export function AgentDraftsView() {
  const [drafts, setDrafts] = useState<InternalDraft[]>([]);
  const [title, setTitle] = useState("");
  const [brief, setBrief] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/agent-drafts", { credentials: "same-origin", cache: "no-store" });
      if (!response.ok) throw new Error(response.status === 403
        ? "You do not have permission to review campaign drafts." : "Could not load internal drafts.");
      const data = await response.json();
      if (data.executionEnabled !== false || !Array.isArray(data.drafts)) throw new Error("Unsafe draft response.");
      setDrafts(data.drafts);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Draft listing unavailable.");
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const idempotencyKey = "staffdraft_" + crypto.randomUUID().replaceAll("-", "");
      const response = await fetch("/api/agent-drafts", {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), brief: brief.trim(), idempotencyKey }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save draft.");
      if (!data.draft || data.draft.status !== "DRAFT" || data.executionEnabled !== false ||
          data.published !== false || data.scheduled !== false) throw new Error("Unsafe save response.");
      setTitle(""); setBrief("");
      setNotice("Internal draft saved. No post was scheduled or published.");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save draft.");
    } finally { setBusy(false); }
  };

  const copy = async (draft: InternalDraft) => {
    try {
      await navigator.clipboard.writeText(draft.title + "\n\n" + draft.brief);
      setNotice("Internal draft copied. Review all claims before sharing.");
    } catch { setError("Clipboard access was denied by your browser."); }
  };

  return (
    <section className="mx-auto max-w-6xl space-y-6 pb-12">
      <header className="rounded-2xl border border-cyan-900/60 bg-slate-900 p-5">
        <div className="flex items-center gap-3">
          <FilePenLine className="h-7 w-7 text-cyan-300" />
          <div>
            <h1 className="text-2xl font-semibold text-white">Internal Agent Drafts</h1>
            <p className="text-sm text-slate-300">Private campaign planning workspace</p>
          </div>
        </div>
        <p className="mt-4 flex items-center gap-2 text-sm text-emerald-300">
          <ShieldCheck className="h-4 w-4" /> Drafts cannot send, schedule, publish or charge customers.
        </p>
        <p className="mt-2 text-sm text-slate-400">
          You can paste a reviewed planning brief from V79 Hub here. Marketing saves a separate,
          internal-only draft. It does not automatically trust a Hub approval or create a live campaign.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <form onSubmit={save} className="rounded-2xl border border-slate-700 bg-slate-900 p-5 space-y-4">
          <h2 className="text-lg font-semibold text-white">New internal brief</h2>
          <label className="block text-sm text-slate-300">
            Title
            <input className="mt-2 w-full rounded-lg border border-slate-600 bg-slate-950 p-3 text-white"
              value={title} onChange={event => setTitle(event.target.value)} maxLength={160}
              minLength={4} required placeholder="Campaign review topic" />
          </label>
          <label className="block text-sm text-slate-300">
            Planning brief
            <textarea className="mt-2 h-48 w-full rounded-lg border border-slate-600 bg-slate-950 p-3 text-white"
              value={brief} onChange={event => setBrief(event.target.value)} maxLength={2000}
              minLength={12} required placeholder="Paste the Hub-approved planning brief or write internal notes..." />
          </label>
          <button type="submit" disabled={busy || !title.trim() || !brief.trim()}
            className="rounded-xl bg-cyan-400 px-5 py-3 font-semibold text-slate-950 disabled:opacity-50">
            {busy ? "Saving…" : "Save internal draft only"}
          </button>
        </form>
        <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-white">Saved drafts</h2>
            <button onClick={() => void load()} className="rounded-lg border border-slate-600 p-2 text-cyan-200"
              aria-label="Refresh internal drafts"><RefreshCcw className="h-4 w-4" /></button>
          </div>
          {loading && <p className="mt-4 text-sm text-slate-400">Loading drafts…</p>}
          {!loading && drafts.length === 0 && <p className="mt-4 text-sm text-slate-400">No internal drafts saved yet.</p>}
          <div className="mt-4 max-h-[580px] space-y-3 overflow-y-auto">
            {drafts.map(draft => (
              <article key={draft.id} className="rounded-xl border border-slate-700 bg-slate-950 p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-white">{draft.title}</h3>
                  <span className="text-xs text-emerald-300">DRAFT</span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-300">{draft.brief}</p>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="text-xs text-slate-500">{new Date(draft.createdAt).toLocaleString()}</span>
                  <button onClick={() => void copy(draft)}
                    className="flex items-center gap-2 rounded-md border border-slate-600 px-3 py-1 text-xs text-cyan-200">
                    <ClipboardCopy className="h-3 w-3" /> Copy for review
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
      {error && <p role="alert" className="rounded-lg border border-red-800 bg-red-950/50 p-3 text-sm text-red-200">{error}</p>}
      {notice && <p role="status" className="rounded-lg border border-emerald-800 bg-emerald-950/50 p-3 text-sm text-emerald-200">{notice}</p>}
    </section>
  );
}
