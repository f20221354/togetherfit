"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import clsx from "clsx";
import { useConnectStore } from "@/lib/store/connectStore";
import { useWellnessStore } from "@/lib/store/wellnessStore";
import { MOCK_PARTNERS } from "@/lib/connect/mockPartners";
import { ACTIVITY_META, ActivityType } from "@/lib/connect/types";
import { EventType } from "@/lib/types";

const QUICK_MESSAGES = ["Sounds good!", "See you there", "Can we push 30 min later?", "I'll bring water"];

const ACTIVITY_COMPLETION_EVENT: Partial<Record<ActivityType, EventType>> = {
  running: "run_completed",
  gym: "gym_session_completed",
  cycling: "cycling_completed",
  yoga: "yoga_completed",
  sports: "sports_completed",
  hiking: "hiking_completed",
  walking: "walk_completed",
  sunlightWalk: "walk_completed",
};

export default function ChatPage() {
  const params = useParams<{ conversationId: string }>();
  const router = useRouter();
  const conversationId = params.conversationId;

  const conversations = useConnectStore((s) => s.conversations);
  const messages = useConnectStore((s) => s.messages);
  const plans = useConnectStore((s) => s.plans);
  const sendMessage = useConnectStore((s) => s.sendMessage);
  const markConversationRead = useConnectStore((s) => s.markConversationRead);
  const completeActivity = useConnectStore((s) => s.completeActivity);
  const leaveGroup = useConnectStore((s) => s.leaveGroup);
  const blockUser = useConnectStore((s) => s.blockUser);
  const logEvent = useWellnessStore((s) => s.logEvent);

  const [draft, setDraft] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const conversation = conversations.find((c) => c.id === conversationId);
  const partner = conversation ? MOCK_PARTNERS.find((p) => p.id === conversation.participantIds[0]) : null;
  const plan = plans.find((p) => p.conversationId === conversationId);
  const thread = messages.filter((m) => m.conversationId === conversationId);

  useEffect(() => {
    markConversationRead(conversationId);
  }, [conversationId, markConversationRead, thread.length]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [thread.length]);

  if (!conversation || !partner) {
    return <div className="mx-auto max-w-lg text-sm text-muted">This conversation isn&apos;t available.</div>;
  }

  const meta = ACTIVITY_META[conversation.activity];

  function handleSend(text: string) {
    if (!text.trim()) return;
    sendMessage(conversationId, text.trim());
    setDraft("");
  }

  function handleCompleteActivity() {
    const eventType = ACTIVITY_COMPLETION_EVENT[conversation!.activity];
    if (eventType) logEvent(eventType, { duration: 900 });
    if (plan) completeActivity(plan.id);
    router.push("/connect");
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-2xl flex-col rounded-2xl border border-border bg-surface">
      <div className="flex items-center gap-3 border-b border-border p-4">
        <button onClick={() => router.push("/connect")} className="text-muted hover:text-foreground">
          ←
        </button>
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-lg">
          {partner.avatar}
        </span>
        <div className="flex-1">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            {partner.name}
            <span className="h-1.5 w-1.5 rounded-full bg-success" title="Online" />
          </div>
          <div className="text-xs text-muted">
            {meta.icon} {meta.label} · {conversation.contextLabel}
          </div>
        </div>
        <div className="relative">
          <button onClick={() => setShowMenu((v) => !v)} className="rounded-full p-2 text-muted hover:bg-surface-2">
            ⋯
          </button>
          {showMenu && (
            <div className="absolute right-0 top-full z-10 mt-1 w-44 rounded-xl border border-border bg-surface p-1 shadow-lg">
              {plan && plan.groupSize > 2 && (
                <button
                  onClick={() => {
                    leaveGroup(plan.id);
                    router.push("/connect");
                  }}
                  className="block w-full rounded-lg px-3 py-2 text-left text-xs text-foreground hover:bg-surface-2"
                >
                  Leave Group
                </button>
              )}
              <button
                onClick={() => router.push("/connect")}
                className="block w-full rounded-lg px-3 py-2 text-left text-xs text-foreground hover:bg-surface-2"
              >
                Leave Conversation
              </button>
              <button
                onClick={() => {
                  blockUser(partner.id);
                  router.push("/connect");
                }}
                className="block w-full rounded-lg px-3 py-2 text-left text-xs text-danger hover:bg-danger/10"
              >
                Report / Block
              </button>
            </div>
          )}
        </div>
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto p-4">
        {thread.length === 0 && (
          <p className="text-center text-xs text-muted">Say hello and plan your {meta.label.toLowerCase()}.</p>
        )}
        <div className="flex flex-col gap-2">
          {thread.map((message) => (
            <div
              key={message.id}
              className={clsx("flex flex-col", message.senderId === "me" ? "items-end" : "items-start")}
            >
              <div
                className={clsx(
                  "max-w-[75%] rounded-2xl px-3.5 py-2 text-sm",
                  message.senderId === "me" ? "bg-accent text-black" : "bg-surface-2 text-foreground"
                )}
              >
                {message.text}
              </div>
              <span className="mt-0.5 text-[10px] text-muted">
                {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                {message.senderId === "me" && (message.read ? " · Read" : " · Sent")}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 border-t border-border p-2">
        {plan && (
          <button
            onClick={handleCompleteActivity}
            className="rounded-full bg-accent/15 px-3 py-1.5 text-xs font-medium text-accent-foreground hover:bg-accent/25"
          >
            Confirm Complete
          </button>
        )}
        {QUICK_MESSAGES.map((q) => (
          <button
            key={q}
            onClick={() => handleSend(q)}
            className="rounded-full border border-border px-3 py-1.5 text-xs text-muted hover:bg-surface-2"
          >
            {q}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend(draft);
        }}
        className="flex items-center gap-2 border-t border-border p-3"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Message…"
          className="flex-1 rounded-full border border-border bg-surface-2 px-4 py-2 text-sm text-foreground outline-none focus:border-accent"
        />
        <button
          type="submit"
          className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-black hover:opacity-90"
        >
          Send
        </button>
      </form>
    </div>
  );
}
