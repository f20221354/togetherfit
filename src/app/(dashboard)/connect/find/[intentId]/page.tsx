"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import clsx from "clsx";
import { useCurrentUser } from "@/lib/auth/authStore";
import { sportMeta } from "@/lib/connect/sports";
import { timeSlotLabel } from "@/lib/connect/timeSlot";

interface RadarPerson {
  userId: string;
  name: string;
  mode: "now" | "scheduled";
  startTime: string;
  approxDistanceKm: number;
  connection: "none" | "requested" | "incoming" | "connected";
  connectionId: string | null;
}

interface RadarGroup {
  groupId: string;
  name: string;
  mode: "now" | "scheduled";
  startTime: string;
  memberCount: number;
  approxDistanceKm: number;
  joined: boolean;
}

interface RadarData {
  intent: {
    id: string;
    sport: string;
    mode: "now" | "scheduled";
    startTime: string;
    areaLabel: string | null;
    radiusKm: number;
    hidden: boolean;
    status: string;
  };
  now: RadarPerson[];
  scheduled: RadarPerson[];
  groups: RadarGroup[];
}

const POLL_MS = 5_000;
const HEARTBEAT_MS = 30_000;

function distanceLabel(km: number): string {
  return km <= 0.5 ? "< 1 km away" : `~${km} km away`;
}

/** Stable pseudo-random angle per user, so dots don't jump around between polls. */
function angleFor(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return (h % 360) * (Math.PI / 180);
}

function RadarVisual({ people, radiusKm, icon }: { people: RadarPerson[]; radiusKm: number; icon: string }) {
  return (
    <div className="relative mx-auto aspect-square w-64 max-w-full">
      <div className="absolute inset-0 rounded-full border border-accent/30 bg-accent/5" />
      <div className="absolute inset-[16%] rounded-full border border-accent/20" />
      <div className="absolute inset-[33%] rounded-full border border-accent/20" />
      <div className="radar-ping absolute inset-0 rounded-full border-2 border-accent/50" />
      <div
        className="radar-sweep absolute inset-0 rounded-full"
        style={{ background: "conic-gradient(from 0deg, rgba(52,211,153,0.35), transparent 25%)" }}
      />
      {people.map((p) => {
        const r = 0.12 + Math.min(1, p.approxDistanceKm / Math.max(radiusKm, 1)) * 0.78;
        const a = angleFor(p.userId);
        return (
          <span
            key={p.userId}
            title={p.name}
            className="absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-black shadow"
            style={{ left: `${50 + Math.cos(a) * r * 50}%`, top: `${50 + Math.sin(a) * r * 50}%` }}
          >
            {p.name.charAt(0).toUpperCase()}
          </span>
        );
      })}
      <span className="absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-surface text-xl shadow">
        {icon}
      </span>
    </div>
  );
}

export default function RadarPage() {
  const user = useCurrentUser();
  const router = useRouter();
  const { intentId } = useParams<{ intentId: string }>();

  const [data, setData] = useState<RadarData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"individuals" | "groups">("individuals");
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [reportFor, setReportFor] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [groupName, setGroupName] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/find/radar?email=${encodeURIComponent(user.email)}&intentId=${intentId}`);
      const json = await res.json();
      if (json.ok) {
        setData(json);
        setError(null);
      } else {
        setError(json.error ?? "Couldn't load the radar.");
      }
    } catch {
      setError("Couldn't reach the server — is DATABASE_URL configured?");
    }
  }, [user, intentId]);

  // Live results.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch(`/api/find/radar?email=${encodeURIComponent(user!.email)}&intentId=${intentId}`);
        const json = await res.json();
        if (cancelled) return;
        if (json.ok) {
          setData(json);
          setError(null);
        } else {
          setError(json.error ?? "Couldn't load the radar.");
        }
      } catch {
        if (!cancelled) setError("Couldn't reach the server — is DATABASE_URL configured?");
      }
    }
    poll();
    const interval = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [user, intentId]);

  // Presence: if this page closes, heartbeats stop and a "Now" search drops off the radar within ~90 s.
  useEffect(() => {
    if (!user) return;
    function beat() {
      fetch("/api/find/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user!.email, intentId }),
      }).catch(() => {});
    }
    beat();
    const interval = setInterval(beat, HEARTBEAT_MS);
    return () => clearInterval(interval);
  }, [user, intentId]);

  async function post(url: string, body: Record<string, unknown>) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: user!.email, ...body }),
    });
    return res.json();
  }

  async function sendRequest(person: RadarPerson) {
    if (!user) return;
    setBusy(person.userId);
    setNotice(null);
    try {
      const json = await post("/api/find/request", { name: user.name, intentId, toUserId: person.userId });
      setNotice(json.ok ? `Request sent to ${person.name}.` : json.error);
      await load();
    } finally {
      setBusy(null);
    }
  }

  async function joinGroup(group: RadarGroup) {
    if (!user) return;
    setBusy(group.groupId);
    try {
      const json = await post(`/api/groups/${group.groupId}/join`, {});
      if (json.ok) router.push(`/connect/groups/${group.groupId}`);
      else setNotice(json.error);
    } finally {
      setBusy(null);
    }
  }

  async function startGroup() {
    if (!user || !groupName.trim()) return;
    setBusy("new-group");
    try {
      const json = await post("/api/groups", { intentId, name: groupName });
      if (json.ok) router.push(`/connect/groups/${json.groupId}`);
      else setNotice(json.error);
    } finally {
      setBusy(null);
    }
  }

  async function block(person: RadarPerson) {
    setMenuFor(null);
    const json = await post("/api/connections/block", { targetUserId: person.userId });
    setNotice(json.ok ? `${person.name} is blocked. You won't see each other again.` : json.error);
    await load();
  }

  async function report(person: RadarPerson) {
    const json = await post("/api/connections/report", { targetUserId: person.userId, reason: reportReason });
    setReportFor(null);
    setReportReason("");
    setNotice(json.ok ? `Thanks — ${person.name} was reported and blocked.` : json.error);
    await load();
  }

  async function toggleHidden() {
    if (!data) return;
    await post("/api/find/visibility", { intentId, hidden: !data.intent.hidden });
    await load();
  }

  async function cancelSearch() {
    await post("/api/find/cancel", { intentId });
    router.push("/connect");
  }

  if (error && !data) {
    return (
      <div className="mx-auto max-w-2xl">
        <p className="text-sm text-danger">{error}</p>
        <Link href="/connect/find" className="text-sm text-accent-foreground hover:underline">
          Start a new search →
        </Link>
      </div>
    );
  }
  if (!data) return <p className="text-sm text-muted">Starting radar…</p>;

  const meta = sportMeta(data.intent.sport);
  const people = [...data.now, ...data.scheduled];

  if (data.intent.status !== "active") {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 text-center">
        <span className="text-4xl">{meta.icon}</span>
        <h1 className="text-lg font-semibold text-foreground">This search has ended</h1>
        <p className="text-sm text-muted">
          {data.intent.status === "cancelled"
            ? "You cancelled it, or started a newer search."
            : data.intent.mode === "now"
              ? "It expired after you went offline."
              : "Its time slot has passed."}
        </p>
        <Link href="/connect/find" className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-black hover:opacity-90">
          Start a new search
        </Link>
      </div>
    );
  }

  function renderPerson(person: RadarPerson) {
    return (
      <div key={person.userId} className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/15 text-sm font-bold text-accent-foreground">
            {person.name.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-foreground">{person.name}</div>
            <div className="text-xs text-muted">
              {meta.icon} {meta.label} · {timeSlotLabel(person.mode, person.startTime)} · {distanceLabel(person.approxDistanceKm)}
            </div>
          </div>
          <button
            onClick={() => setMenuFor(menuFor === person.userId ? null : person.userId)}
            aria-label={`More options for ${person.name}`}
            className="rounded-full px-2 text-lg text-muted hover:text-foreground"
          >
            ⋯
          </button>
        </div>

        {menuFor === person.userId && (
          <div className="flex gap-2">
            <button onClick={() => block(person)} className="rounded-full border border-border px-3 py-1 text-xs text-foreground hover:bg-surface-2">
              Block
            </button>
            <button
              onClick={() => {
                setReportFor(person.userId);
                setMenuFor(null);
              }}
              className="rounded-full border border-danger/40 px-3 py-1 text-xs text-danger hover:bg-danger/10"
            >
              Report
            </button>
          </div>
        )}

        {reportFor === person.userId && (
          <div className="flex flex-col gap-2">
            <input
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="What happened? (optional)"
              className="rounded-xl border border-border bg-surface-2 px-3 py-2 text-xs text-foreground outline-none focus:border-accent"
            />
            <div className="flex gap-2">
              <button onClick={() => report(person)} className="rounded-full bg-danger px-3 py-1 text-xs font-semibold text-white">
                Report & block
              </button>
              <button onClick={() => setReportFor(null)} className="rounded-full border border-border px-3 py-1 text-xs text-foreground">
                Cancel
              </button>
            </div>
          </div>
        )}

        {person.connection === "connected" && person.connectionId ? (
          <Link
            href={`/connect/messages/${person.connectionId}`}
            className="rounded-full border border-border px-4 py-2 text-center text-sm font-medium text-foreground hover:bg-surface-2"
          >
            💬 Connected — chat
          </Link>
        ) : person.connection === "requested" ? (
          <button disabled className="rounded-full bg-surface-2 px-4 py-2 text-sm text-muted">
            Requested ✓
          </button>
        ) : person.connection === "incoming" ? (
          <Link href="/connect/friends" className="rounded-full bg-accent px-4 py-2 text-center text-sm font-semibold text-black hover:opacity-90">
            They sent you a request — respond
          </Link>
        ) : (
          <button
            onClick={() => sendRequest(person)}
            disabled={busy === person.userId}
            className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-60"
          >
            {busy === person.userId ? "Sending…" : "Send request"}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <div className="flex items-center justify-between gap-2">
        <Link href="/connect" className="text-sm text-muted hover:text-foreground">
          ← Connect
        </Link>
        <button onClick={cancelSearch} className="rounded-full border border-border px-4 py-1.5 text-xs font-medium text-foreground hover:bg-surface-2">
          Cancel search
        </button>
      </div>

      <RadarVisual people={people} radiusKm={data.intent.radiusKm} icon={meta.icon} />

      <div className="text-center">
        <div className="text-lg font-semibold text-foreground">
          {people.length} {people.length === 1 ? "person" : "people"} looking for {meta.label} near you
        </div>
        <div className="text-xs text-muted">
          {data.intent.areaLabel ?? "Your area"} · {data.intent.radiusKm} km · {timeSlotLabel(data.intent.mode, data.intent.startTime)} · updates live
        </div>
      </div>

      <label className="flex items-center justify-center gap-2 text-xs text-muted">
        <input type="checkbox" checked={data.intent.hidden} onChange={toggleHidden} />
        Hide me from radar (you can still see others)
      </label>

      {notice && <p className="rounded-xl bg-surface-2 px-4 py-2 text-center text-sm text-foreground">{notice}</p>}

      <div className="flex gap-2 rounded-full bg-surface-2 p-1">
        {(["individuals", "groups"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={clsx(
              "flex-1 rounded-full px-4 py-1.5 text-sm font-medium",
              tab === t ? "bg-surface text-foreground shadow-sm" : "text-muted"
            )}
          >
            {t === "individuals" ? `Individuals (${people.length})` : `Groups (${data.groups.length})`}
          </button>
        ))}
      </div>

      {tab === "individuals" ? (
        <div className="flex flex-col gap-4">
          {people.length === 0 && (
            <p className="text-center text-sm text-muted">
              No one yet. Keep this screen open — new people appear here automatically.
            </p>
          )}
          {data.now.length > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">⚡ Free now</h2>
              {data.now.map(renderPerson)}
            </section>
          )}
          {data.scheduled.length > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">📅 Scheduled</h2>
              {data.scheduled.map(renderPerson)}
            </section>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {data.groups.map((g) => (
            <div key={g.groupId} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4">
              <span className="text-2xl">{meta.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-foreground">{g.name}</div>
                <div className="text-xs text-muted">
                  {g.memberCount} {g.memberCount === 1 ? "member" : "members"} · {meta.label} · {timeSlotLabel(g.mode, g.startTime)} ·{" "}
                  {distanceLabel(g.approxDistanceKm)}
                </div>
              </div>
              {g.joined ? (
                <Link href={`/connect/groups/${g.groupId}`} className="rounded-full border border-border px-4 py-1.5 text-xs font-medium text-foreground hover:bg-surface-2">
                  Open chat
                </Link>
              ) : (
                <button
                  onClick={() => joinGroup(g)}
                  disabled={busy === g.groupId}
                  className="rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-black hover:opacity-90 disabled:opacity-60"
                >
                  Join
                </button>
              )}
            </div>
          ))}
          {data.groups.length === 0 && <p className="text-center text-sm text-muted">No groups nearby for this time yet.</p>}

          <div className="flex gap-2 rounded-2xl border border-dashed border-border p-3">
            <input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder={`Start a group, e.g. "Morning ${meta.label} Crew"`}
              className="flex-1 rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
            />
            <button
              onClick={startGroup}
              disabled={!groupName.trim() || busy === "new-group"}
              className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-50"
            >
              Start
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
