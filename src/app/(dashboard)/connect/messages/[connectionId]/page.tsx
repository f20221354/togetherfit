"use client";

import { useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCurrentUser } from "@/lib/auth/authStore";
import { SPORTS } from "@/lib/connect/sports";
import { CELEBRATION_REACTIONS, CelebrationCard, REACTION_META, isReaction } from "@/lib/connect/milestones";
import { logActivityAndCelebrate } from "@/lib/connect/logActivity";
import { CelebrationCardView } from "@/components/connect/CelebrationCardView";
import { ChatMessage, useConversation } from "@/lib/chat/useConversation";
import { useChatScroll } from "@/lib/chat/useChatScroll";
import { ConnectionMenu } from "@/components/connect/ConnectionMenu";
import { Avatar } from "@/components/profile/Avatar";
import { Icon } from "@/components/ui/Icon";

function parseCard(body: string): CelebrationCard | null {
  try {
    return JSON.parse(body) as CelebrationCard;
  } catch {
    return null;
  }
}

function expiresLabel(expiresAt: string | null | undefined): string {
  if (!expiresAt) return "";
  const hours = Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 3_600_000));
  return hours <= 1 ? "Disappears within the hour" : `Disappears in ${hours}h`;
}

export default function ConnectionChatPage() {
  const { connectionId } = useParams<{ connectionId: string }>();
  // A fresh component per conversation, so no state leaks between chats.
  return <Conversation key={connectionId} connectionId={connectionId} />;
}

function Conversation({ connectionId }: { connectionId: string }) {
  const user = useCurrentUser();
  const router = useRouter();
  const justConnected = useSearchParams().get("new") === "1";
  const { messages, partner, ended, hasMore, loadingOlder, error, loadOlder, send, retry, react } = useConversation(connectionId);

  const [draft, setDraft] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [logging, setLogging] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const { listRef, onScroll, showOlder, scrollToLatest } = useChatScroll(messages, loadOlder);

  async function submit() {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    setSendError(null);
    scrollToLatest();
    const result = await send(text);
    if (!result.ok && result.error) setSendError(result.error);
  }

  async function resend(message: ChatMessage) {
    setSendError(null);
    const result = await retry(message);
    if (!result.ok && result.error) setSendError(result.error);
  }

  async function logSession(sport: string) {
    if (!user) return;
    setLogging(false);
    const result = await logActivityAndCelebrate(user, { sport, connectionId });
    setNotice(result.ok ? "Session logged together." : (result.error ?? "Couldn't log the session."));
  }

  function renderCelebration(m: ChatMessage) {
    const card = parseCard(m.body);
    if (!card) return null;
    return (
      <div className="flex flex-col gap-1.5">
        <CelebrationCardView card={card} compact />
        <div className="text-[11px] text-muted">Celebration · {expiresLabel(m.expiresAt)}</div>
        {m.mine ? (
          <div className="flex items-center gap-1 text-xs text-muted">
            {isReaction(m.reaction) ? (
              <>
                They reacted <Icon name={REACTION_META[m.reaction].icon} size={14} weight="fill" className="text-accent-foreground" label={REACTION_META[m.reaction].label} />
              </>
            ) : (
              "No reaction yet"
            )}
          </div>
        ) : (
          <div className="flex gap-1">
            {CELEBRATION_REACTIONS.map((reaction) => (
              <button
                key={reaction}
                onClick={() => react(m.id, reaction)}
                aria-label={`React with ${REACTION_META[reaction].label}`}
                aria-pressed={m.reaction === reaction}
                className={`flex h-8 w-8 items-center justify-center rounded-full ${m.reaction === reaction ? "bg-accent/30 text-accent-foreground" : "text-muted hover:bg-surface-2 hover:text-foreground"}`}
              >
                <Icon name={REACTION_META[reaction].icon} size={18} weight={m.reaction === reaction ? "fill" : "regular"} />
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-[calc(100dvh-14rem-env(safe-area-inset-bottom))] min-h-[22rem] max-w-2xl flex-col gap-4 md:h-[calc(100dvh-11rem)]">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push("/connect/messages")} aria-label="Back to messages" className="text-lg text-muted hover:text-foreground">
          ←
        </button>
        {partner ? (
          <>
            <Avatar name={partner.name} photoId={partner.photoId} verified={partner.verified} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-base font-semibold text-foreground">{partner.name}</div>
              {partner.verified && <div className="text-xs text-sky-500">✓ Verified</div>}
            </div>
            {!ended && (
              <ConnectionMenu
                connectionId={connectionId}
                name={partner.name.split(" ")[0]}
                onDone={() => router.replace("/connect/messages")}
              />
            )}
          </>
        ) : (
          <div className="flex-1 text-base font-semibold text-foreground">Conversation</div>
        )}
      </div>

      {ended && (
        <div className="rounded-2xl border border-border bg-surface-2 px-4 py-3 text-sm text-muted">
          This conversation has ended. You&apos;re no longer connected with this person.
        </div>
      )}

      {justConnected && (
        <div className="rounded-2xl border border-accent/40 bg-accent/10 px-4 py-3 text-sm font-medium text-foreground">
          You&apos;re connected. Say hi!
        </div>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex flex-col gap-2">
        {logging ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted">What did you do together?</span>
            {SPORTS.map((s) => (
              <button
                key={s.key}
                onClick={() => logSession(s.key)}
                className="rounded-full border border-border px-3 py-1 text-xs text-foreground hover:bg-surface-2"
              >
                <Icon name={s.icon} size={14} className="inline-block align-[-0.2em]" /> {s.label}
              </button>
            ))}
            <button onClick={() => setLogging(false)} className="text-xs text-muted hover:text-foreground">
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              setLogging(true);
              setNotice(null);
            }}
            className="self-start rounded-full border border-accent/40 px-4 py-1.5 text-xs font-medium text-foreground hover:bg-accent/10"
          >
            <Icon name="status.done" size={14} className="mr-1 inline-block align-[-0.15em]" />
            Log a session together
          </button>
        )}
        {notice && <p className="text-xs text-muted">{notice}</p>}
      </div>

      <div
        ref={listRef}
        onScroll={onScroll}
        className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto rounded-2xl border border-border bg-surface p-4"
      >
        {hasMore && (
          <button
            onClick={showOlder}
            disabled={loadingOlder}
            className="self-center rounded-full border border-border px-3 py-1 text-xs text-muted hover:text-foreground disabled:opacity-60"
          >
            {loadingOlder ? "Loading…" : "Load earlier messages"}
          </button>
        )}
        {messages === null ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : messages.length === 0 ? (
          <p className="text-center text-sm text-muted">You&apos;re connected. Say hi!</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`flex flex-col ${m.mine ? "items-end" : "items-start"}`}>
              {m.type === "celebration" ? (
                renderCelebration(m)
              ) : (
                <div
                  className={`max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm [overflow-wrap:anywhere] ${
                    m.mine ? "bg-accent text-black" : "bg-surface-2 text-foreground"
                  } ${m.pending ? "opacity-60" : ""}`}
                >
                  {m.body}
                </div>
              )}
              {m.failed && (
                <button onClick={() => void resend(m)} className="mt-0.5 text-[11px] text-danger hover:underline">
                  Not sent · Retry
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {sendError && <p className="-mt-2 text-xs text-danger">{sendError}</p>}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        className={`flex items-center gap-2 ${ended ? "hidden" : ""}`}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a message…"
          maxLength={2000}
          className="min-w-0 flex-1 rounded-full border border-border bg-surface-2 px-4 py-2.5 text-base text-foreground outline-none focus:border-accent md:text-sm"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          className="shrink-0 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-60"
        >
          Send
        </button>
      </form>
    </div>
  );
}
