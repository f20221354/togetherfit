"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/shell/PageHeader";
import { useCurrentUser } from "@/lib/auth/authStore";
import { sportMeta } from "@/lib/connect/sports";
import { timeSlotLabel } from "@/lib/connect/timeSlot";
import { logActivityAndCelebrate } from "@/lib/connect/logActivity";
import { ChatMessage, useConversation } from "@/lib/chat/useConversation";
import { useChatScroll } from "@/lib/chat/useChatScroll";
import { Icon } from "@/components/ui/Icon";

export default function GroupChatPage() {
  const { groupId } = useParams<{ groupId: string }>();
  // A fresh component per group, so no state leaks between chats.
  return <GroupConversation key={groupId} groupId={groupId} />;
}

function GroupConversation({ groupId }: { groupId: string }) {
  const user = useCurrentUser();
  const router = useRouter();
  const { messages, group, ended, hasMore, loadingOlder, error, loadOlder, send, retry } = useConversation(groupId, "group");
  const { listRef, onScroll, showOlder, scrollToLatest } = useChatScroll(messages, loadOlder);

  const [draft, setDraft] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

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

  async function logSession() {
    if (!user || !group) return;
    const result = await logActivityAndCelebrate(user, { sport: group.sport, groupId });
    setNotice(result.ok ? "Group session logged." : (result.error ?? "Couldn't log the session."));
  }

  const meta = group ? sportMeta(group.sport) : null;

  return (
    <div className="mx-auto flex h-[calc(100dvh-14rem-env(safe-area-inset-bottom))] min-h-[22rem] max-w-2xl flex-col gap-4 md:h-[calc(100dvh-11rem)]">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push("/connect/messages")} aria-label="Back to messages" className="text-lg text-muted hover:text-foreground">
          ←
        </button>
        <PageHeader
          icon={meta?.icon ?? "people.friends"}
          title={group?.name ?? "Group"}
          subtitle={
            group && meta
              ? `${meta.label} · ${timeSlotLabel(group.mode, group.startTime)} · ${group.members.length} ${group.members.length === 1 ? "member" : "members"}`
              : ""
          }
        />
      </div>

      {group && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted">Members: {group.members.join(", ")}</p>
          <button
            onClick={logSession}
            className="rounded-full border border-accent/40 px-4 py-1.5 text-xs font-medium text-foreground hover:bg-accent/10"
          >
            <Icon name="status.done" size={14} className="mr-1 inline-block align-[-0.15em]" />
            We did it: log this session
          </button>
        </div>
      )}
      {ended && (
        <div className="rounded-2xl border border-border bg-surface-2 px-4 py-3 text-sm text-muted">
          You&apos;re not in this group, so its chat isn&apos;t available.
        </div>
      )}
      {notice && <p className="text-xs text-muted">{notice}</p>}
      {error && <p className="text-sm text-danger">{error}</p>}

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
          <p className="text-sm text-muted">{error ? "" : "Loading…"}</p>
        ) : messages.length === 0 ? (
          <p className="text-center text-sm text-muted">You&apos;re in the group. Say hi!</p>
        ) : (
          messages.map((m, i) => {
            const showName = !m.mine && messages[i - 1]?.senderName !== m.senderName;
            return (
              <div key={m.id} className={`flex flex-col ${m.mine ? "items-end" : "items-start"}`}>
                {showName && <span className="mb-0.5 text-[11px] text-muted">{m.senderName}</span>}
                <div
                  className={`max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm [overflow-wrap:anywhere] ${
                    m.mine ? "bg-accent text-black" : "bg-surface-2 text-foreground"
                  } ${m.pending ? "opacity-60" : ""}`}
                >
                  {m.body}
                </div>
                {m.failed && (
                  <button onClick={() => void resend(m)} className="mt-0.5 text-[11px] text-danger hover:underline">
                    Not sent · Retry
                  </button>
                )}
              </div>
            );
          })
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
          placeholder="Message the group…"
          aria-label="Message the group"
          maxLength={2000}
          className="min-w-0 flex-1 rounded-full border border-border bg-surface-2 px-4 py-2.5 text-base text-foreground outline-none focus:border-accent md:text-sm"
        />
        <button
          type="submit"
          disabled={!draft.trim() || !messages}
          className="shrink-0 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-60"
        >
          Send
        </button>
      </form>
    </div>
  );
}
