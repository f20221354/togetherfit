"use client";

import { useEffect, useState } from "react";
import { useCurrentUser } from "@/lib/auth/authStore";
import { useCelebrationStore } from "@/lib/connect/celebrationStore";
import { CelebrationCard } from "@/lib/connect/milestones";
import { shareCelebrationImage } from "@/lib/connect/celebrationImage";
import { CelebrationCardView } from "./CelebrationCardView";

const CONFETTI_COLORS = ["#34d399", "#fbbf24", "#f472b6", "#60a5fa", "#a78bfa"];
const CONFETTI_PIECES = Array.from({ length: 48 }, (_, i) => ({
  left: `${(i * 37) % 100}%`,
  delay: `${((i * 53) % 90) / 100}s`,
  drift: `${((i * 29) % 120) - 60}px`,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
}));

interface Friend {
  connectionId: string;
  name: string;
}

/**
 * Full-screen celebration shown whenever a logged activity unlocks a
 * milestone (queued via useCelebrationStore). Mounted once in AppShell.
 */
export function CelebrationOverlay() {
  const card = useCelebrationStore((s) => s.queue[0]);
  const dismiss = useCelebrationStore((s) => s.dismiss);
  if (!card) return null;
  // Keyed by milestone so each celebration starts with fresh state.
  return <CelebrationDialog key={card.milestoneId} card={card} onClose={dismiss} />;
}

function CelebrationDialog({ card, onClose }: { card: CelebrationCard; onClose: () => void }) {
  const user = useCurrentUser();
  const [friends, setFriends] = useState<Friend[] | null>(null);
  const [picking, setPicking] = useState(false);
  const [sentTo, setSentTo] = useState<string[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function openPicker() {
    setPicking(true);
    if (friends || !user) return;
    try {
      const res = await fetch(`/api/friends/list?email=${encodeURIComponent(user.email)}`);
      const data = await res.json();
      setFriends(data.ok ? data.friends.map((f: Friend) => ({ connectionId: f.connectionId, name: f.name })) : []);
    } catch {
      setFriends([]);
    }
  }

  async function sendTo(friend: Friend) {
    if (!user) return;
    setStatus(null);
    try {
      const res = await fetch(`/api/milestones/${card.milestoneId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email, connectionId: friend.connectionId }),
      });
      const data = await res.json();
      if (data.ok) setSentTo((s) => [...s, friend.connectionId]);
      else setStatus(data.error ?? "Couldn't send.");
    } catch {
      setStatus("Couldn't reach the server.");
    }
  }

  async function share() {
    setStatus(null);
    try {
      const result = await shareCelebrationImage(card);
      if (result === "downloaded") setStatus("Card image saved to your downloads.");
    } catch {
      setStatus("Couldn't create the card image.");
    }
  }

  const secondary = "flex-1 rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/10";

  return (
    <div role="dialog" aria-modal="true" aria-label={`Milestone: ${card.title}`} className="fixed inset-0 z-[70] flex items-center justify-center overflow-hidden bg-black/80 p-4">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        {CONFETTI_PIECES.map((p, i) => (
          <span
            key={i}
            className="confetti-piece"
            style={{ left: p.left, animationDelay: p.delay, backgroundColor: p.color, ["--drift" as string]: p.drift }}
          />
        ))}
      </div>

      <div className="celebration-pop relative flex w-full max-w-sm flex-col items-center gap-4">
        <div className="text-sm font-semibold uppercase tracking-widest text-emerald-300">Milestone unlocked!</div>
        <CelebrationCardView card={card} />

        {picking ? (
          <div className="flex w-full flex-col gap-2 rounded-2xl bg-white/5 p-3">
            <div className="text-xs text-slate-300">Send to a friend (disappears from their chat after 24h)</div>
            {friends === null ? (
              <p className="text-sm text-slate-400">Loading friends…</p>
            ) : friends.length === 0 ? (
              <p className="text-sm text-slate-400">No friends yet — add one from the Friends tab.</p>
            ) : (
              friends.map((f) => (
                <div key={f.connectionId} className="flex items-center justify-between gap-2">
                  <span className="text-sm text-white">{f.name}</span>
                  <button
                    onClick={() => sendTo(f)}
                    disabled={sentTo.includes(f.connectionId)}
                    className="rounded-full bg-emerald-400 px-3 py-1 text-xs font-semibold text-black disabled:bg-white/20 disabled:text-white"
                  >
                    {sentTo.includes(f.connectionId) ? "Sent ✓" : "Send"}
                  </button>
                </div>
              ))
            )}
            <button onClick={() => setPicking(false)} className="text-xs text-slate-400 hover:text-white">
              ← Back
            </button>
          </div>
        ) : (
          <div className="flex w-full gap-2">
            <button onClick={openPicker} className="flex-1 rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-black hover:opacity-90">
              Send to a friend
            </button>
            <button onClick={share} className={secondary}>
              Share / Save
            </button>
          </div>
        )}

        {status && <p className="text-center text-xs text-slate-300">{status}</p>}
        <button onClick={onClose} className="text-sm text-slate-400 hover:text-white">
          Close
        </button>
      </div>
    </div>
  );
}
