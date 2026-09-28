"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import clsx from "clsx";
import { useMoveStore } from "@/lib/store/moveStore";
import { useWellnessStore } from "@/lib/store/wellnessStore";
import { getTrainer } from "@/lib/move/trainers";

export default function TrainerSessionChatPage() {
  const params = useParams<{ requestId: string }>();
  const router = useRouter();
  const trainerRequests = useMoveStore((s) => s.trainerRequests);
  const trainerMessages = useMoveStore((s) => s.trainerMessages);
  const sendTrainerMessage = useMoveStore((s) => s.sendTrainerMessage);
  const respondTrainerRequest = useMoveStore((s) => s.respondTrainerRequest);
  const logWellnessEvent = useWellnessStore((s) => s.logEvent);

  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  const request = trainerRequests.find((r) => r.id === params.requestId);
  const trainer = request ? getTrainer(request.trainerId) : null;
  const thread = trainerMessages.filter((m) => m.conversationId === request?.conversationId);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [thread.length]);

  if (!request || !trainer) {
    return <div className="text-sm text-muted">This session isn&apos;t available.</div>;
  }

  function handleSend(text: string) {
    if (!text.trim()) return;
    sendTrainerMessage(request!.conversationId, text.trim());
    setDraft("");
  }

  function markComplete() {
    logWellnessEvent("trainer_session_completed", { duration: 2700 });
    respondTrainerRequest(request!.id, "completed");
    router.push("/move/trainers");
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-12rem)] max-w-2xl flex-col rounded-2xl border border-border bg-surface">
      <div className="flex items-center gap-3 border-b border-border p-4">
        <button onClick={() => router.push(`/move/trainers/${trainer.id}`)} className="text-muted hover:text-foreground">
          ←
        </button>
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-lg">
          {trainer.avatar}
        </span>
        <div className="flex-1">
          <div className="text-sm font-semibold text-foreground">{trainer.name}</div>
          <div className="text-xs text-muted">
            {request.date} · {request.time} · {request.format} · {request.goal}
          </div>
        </div>
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto p-4">
        {thread.length === 0 && (
          <p className="text-center text-xs text-muted">Your session request was confirmed. Say hello!</p>
        )}
        <div className="flex flex-col gap-2">
          {thread.map((m) => (
            <div key={m.id} className={clsx("flex flex-col", m.sender === "me" ? "items-end" : "items-start")}>
              <div
                className={clsx(
                  "max-w-[75%] rounded-2xl px-3.5 py-2 text-sm",
                  m.sender === "me" ? "bg-accent text-black" : "bg-surface-2 text-foreground"
                )}
              >
                {m.text}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 border-t border-border p-2">
        <button
          onClick={markComplete}
          className="rounded-full bg-accent/15 px-3 py-1.5 text-xs font-medium text-accent-foreground hover:bg-accent/25"
        >
          Mark Session Complete
        </button>
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
          placeholder="Message your trainer…"
          className="flex-1 rounded-full border border-border bg-surface-2 px-4 py-2 text-sm text-foreground outline-none focus:border-accent"
        />
        <button type="submit" className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-black hover:opacity-90">
          Send
        </button>
      </form>
    </div>
  );
}
