"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/shell/PageHeader";
import { useCurrentUser } from "@/lib/auth/authStore";
import { Icon } from "@/components/ui/Icon";

interface OpenReport {
  id: string;
  category: string;
  reason: string;
  createdAt: string;
  reporter: { name: string; code: string };
  reported: {
    id: string;
    name: string;
    code: string;
    verified: boolean;
    hasPhoto: boolean;
    reportCount: number;
    strikes: number;
    restriction: { scope: "radar" | "full"; until: string | null } | null;
  };
}

interface RestrictedUser {
  id: string;
  name: string;
  code: string;
  scope: "radar" | "full";
  until: string | null;
  reason: string | null;
  strikes: number;
}

const NEXT_STEP = ["7 days", "30 days", "permanently"];
const restrictionLabel = (r: { scope: "radar" | "full"; until: string | null }) =>
  `${r.scope === "full" ? "Restricted" : "Hidden from Find a Friend"} ${r.until ? `until ${new Date(r.until).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : "permanently"}`;

interface StuckUser {
  id: string;
  name: string;
  code: string;
  failedAttempts: number;
  lastAttemptAt: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  harassment: "Harassment",
  photo: "Fake / inappropriate photo",
  gender: "Misrepresented gender",
  safety: "Felt unsafe",
  spam: "Spam / scam",
  other: "Other",
};

const when = (iso: string) => new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/** Admins only: user reports and people automatic verification couldn't confirm. */
export default function ModerationPage() {
  const user = useCurrentUser();
  const [reports, setReports] = useState<OpenReport[] | null>(null);
  const [stuck, setStuck] = useState<StuckUser[]>([]);
  const [restricted, setRestricted] = useState<RestrictedUser[]>([]);
  const [error, setError] = useState<string | null>(null);

  const apply = useCallback((data: { ok: boolean; error?: string; reports: OpenReport[]; stuck: StuckUser[]; restricted: RestrictedUser[] }) => {
    if (!data.ok) {
      setError(data.error ?? "Couldn't load moderation queue.");
      return;
    }
    setReports(data.reports);
    setStuck(data.stuck);
    setRestricted(data.restricted);
  }, []);

  const load = useCallback(
    () =>
      fetch("/api/admin/moderation", { cache: "no-store" })
        .then((r) => r.json())
        .then(apply)
        .catch(() => setError("Couldn't reach the server.")),
    [apply]
  );

  useEffect(() => {
    if (!user?.isAdmin) return;
    fetch("/api/admin/moderation", { cache: "no-store" })
      .then((r) => r.json())
      .then(apply)
      .catch(() => setError("Couldn't reach the server."));
  }, [user, apply]);

  async function act(url: string, action: string, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
    const data = await res.json().catch(() => ({}));
    if (!data.ok) setError(data.error ?? "Action failed.");
    await load();
  }

  if (!user?.isAdmin) {
    return <p className="text-sm text-muted">This page is for togetherfit admins.</p>;
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageHeader icon="nav.moderation" title="Moderation" subtitle="Reports, restrictions and verification appeals. Everything else is automatic." />
      {error && <p className="text-sm text-danger">{error}</p>}

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">Open reports {reports && `(${reports.length})`}</h2>
        {reports === null ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : reports.length === 0 ? (
          <p className="text-sm text-muted">Nothing to review.</p>
        ) : (
          reports.map((r) => (
            <div key={r.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
              <div className="flex items-start gap-3">
                {r.reported.hasPhoto ? (
                  // Admin-only, uncached photo route.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/api/admin/photos/${r.reported.id}`} alt={r.reported.name} className="h-14 w-14 shrink-0 rounded-xl object-cover" />
                ) : (
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-xs text-muted">No photo</span>
                )}
                <div className="min-w-0 flex-1 text-sm">
                  <div className="font-semibold text-foreground">
                    {r.reported.name} <span className="font-mono text-xs text-muted">{r.reported.code}</span>
                    {r.reported.verified && <span className="ml-1.5 text-xs text-sky-500">✓ Verified</span>}
                  </div>
                  <div className="text-xs text-danger">
                    {CATEGORY_LABELS[r.category] ?? r.category}
                    {r.reported.reportCount > 1 && ` · reported ${r.reported.reportCount} times in total`}
                  </div>
                  {r.reported.restriction && (
                    <div className="mt-0.5 flex items-center gap-1 text-xs font-medium text-foreground"><Icon name="status.blocked" size={14} className="text-danger" /> {restrictionLabel(r.reported.restriction)} (automatic)</div>
                  )}
                  <p className="mt-1 break-words text-foreground">“{r.reason}”</p>
                  <div className="mt-1 text-xs text-muted">
                    by {r.reporter.name} ({r.reporter.code}) · {when(r.createdAt)}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => act(`/api/admin/reports/${r.id}`, "dismiss")} className="rounded-full border border-border px-3 py-1 text-xs text-foreground hover:bg-surface-2">
                  Dismiss
                </button>
                {r.reported.hasPhoto && (
                  <button
                    onClick={() => act(`/api/admin/reports/${r.id}`, "remove_photo", `Remove ${r.reported.name}'s photo? This also removes their ✓ badge.`)}
                    className="rounded-full border border-danger/40 px-3 py-1 text-xs text-danger hover:bg-danger/10"
                  >
                    Remove photo
                  </button>
                )}
                {r.reported.restriction?.scope !== "full" && (
                  <button
                    onClick={() =>
                      act(
                        `/api/admin/reports/${r.id}`,
                        "restrict",
                        `Restrict ${r.reported.name} ${NEXT_STEP[Math.min(r.reported.strikes, 2)]}? They'll be hidden from Find a Friend and unable to send requests or messages.`
                      )
                    }
                    className="rounded-full border border-danger/40 px-3 py-1 text-xs text-danger hover:bg-danger/10"
                  >
                    Restrict {NEXT_STEP[Math.min(r.reported.strikes, 2)]}
                  </button>
                )}
                {r.reported.verified && (
                  <button
                    onClick={() => act(`/api/admin/reports/${r.id}`, "revoke_verification", `Remove ${r.reported.name}'s ✓ badge?`)}
                    className="rounded-full border border-danger/40 px-3 py-1 text-xs text-danger hover:bg-danger/10"
                  >
                    Revoke ✓
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">Currently restricted ({restricted.length})</h2>
        {restricted.length === 0 ? (
          <p className="text-sm text-muted">No one is restricted.</p>
        ) : (
          restricted.map((u) => (
            <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4 text-sm">
              <div className="min-w-0">
                <div className="font-semibold text-foreground">
                  {u.name} <span className="font-mono text-xs text-muted">{u.code}</span>
                </div>
                <div className="text-xs text-muted">
                  {restrictionLabel(u)} · {u.strikes} strike{u.strikes === 1 ? "" : "s"}
                </div>
                {u.reason && <div className="text-xs text-muted">{u.reason}</div>}
              </div>
              <button
                onClick={() => act(`/api/admin/users/${u.id}`, "lift_restriction", `Lift ${u.name}'s restriction now?`)}
                className="rounded-full border border-border px-3 py-1 text-xs text-foreground hover:bg-surface-2"
              >
                Lift
              </button>
            </div>
          ))
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">Stuck in verification ({stuck.length})</h2>
        <p className="text-xs text-muted">Failed automatic verification 3+ times this week. Usually bad lighting or an unclear profile photo.</p>
        {stuck.length === 0 ? (
          <p className="text-sm text-muted">No one is stuck.</p>
        ) : (
          stuck.map((u) => (
            <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4 text-sm">
              <div>
                <div className="font-semibold text-foreground">
                  {u.name} <span className="font-mono text-xs text-muted">{u.code}</span>
                </div>
                <div className="text-xs text-muted">
                  {u.failedAttempts} failed tries · last {when(u.lastAttemptAt)}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => act(`/api/admin/users/${u.id}`, "allow_retry")} className="rounded-full border border-border px-3 py-1 text-xs text-foreground hover:bg-surface-2">
                  Allow more tries
                </button>
                <button
                  onClick={() => act(`/api/admin/users/${u.id}`, "mark_verified", `Only do this after confirming ${u.name}'s identity another way (e.g. a video call). Mark verified?`)}
                  className="rounded-full border border-border px-3 py-1 text-xs text-foreground hover:bg-surface-2"
                >
                  Mark verified
                </button>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
