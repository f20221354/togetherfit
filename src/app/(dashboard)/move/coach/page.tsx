"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { PageHeader } from "@/components/shell/PageHeader";
import { useMoveStore } from "@/lib/store/moveStore";
import { getCoachSuggestions, respondToCoachPrompt } from "@/lib/move/aiCoach";
import { getWorkoutTemplate } from "@/lib/move/workoutTemplates";

const SUGGESTED_PROMPTS = [
  "What should I do today?",
  "Create a 30-minute workout.",
  "I missed yesterday's workout.",
  "Help me reach my running goal.",
  "Give me a beginner workout.",
  "Find a workout I can do at home.",
];

export default function AiCoachPage() {
  const router = useRouter();
  const goals = useMoveStore((s) => s.goals);
  const workoutHistory = useMoveStore((s) => s.workoutHistory);
  const coachChat = useMoveStore((s) => s.coachChat);
  const sendCoachMessage = useMoveStore((s) => s.sendCoachMessage);
  const appendCoachReply = useMoveStore((s) => s.appendCoachReply);

  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  const suggestions = useMemo(
    () => getCoachSuggestions({ goals, workoutHistory, preferredHour: workoutHistory.length > 0 ? 19 : null }),
    [goals, workoutHistory]
  );

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [coachChat.length]);

  function handleSend(text: string) {
    if (!text.trim()) return;
    sendCoachMessage(text.trim());
    setDraft("");
    const reply = respondToCoachPrompt(text);
    setTimeout(() => appendCoachReply(reply.text, reply.workoutTemplateId), 500);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon="🤖"
        title="AI Coach"
        subtitle="Suggestions based on your activity history — not medical advice."
      />

      <div className="flex flex-col gap-2">
        {suggestions.map((s, i) => {
          const template = s.workoutTemplateId ? getWorkoutTemplate(s.workoutTemplateId) : null;
          return (
            <div key={i} className="rounded-2xl border border-border bg-surface p-4">
              <p className="text-sm text-foreground">{s.message}</p>
              {(template || s.ctaLabel) && (
                <button
                  onClick={() => (template ? router.push("/move/workout") : undefined)}
                  className="mt-3 rounded-full bg-accent/15 px-4 py-2 text-xs font-medium text-accent-foreground hover:bg-accent/25"
                >
                  {s.ctaLabel}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-col rounded-2xl border border-border bg-surface">
        <div ref={listRef} className="flex max-h-96 flex-col gap-2 overflow-y-auto p-4">
          {coachChat.length === 0 && (
            <p className="text-center text-xs text-muted">Ask your coach anything about training, goals, or today&apos;s plan.</p>
          )}
          {coachChat.map((m) => (
            <div key={m.id} className={clsx("flex flex-col", m.sender === "me" ? "items-end" : "items-start")}>
              <div
                className={clsx(
                  "max-w-[80%] rounded-2xl px-3.5 py-2 text-sm",
                  m.sender === "me" ? "bg-accent text-black" : "bg-surface-2 text-foreground"
                )}
              >
                {m.text}
              </div>
              {m.workoutTemplateId && (
                <button
                  onClick={() => router.push("/move/workout")}
                  className="mt-1 rounded-full bg-accent/15 px-3 py-1 text-xs font-medium text-accent-foreground hover:bg-accent/25"
                >
                  {getWorkoutTemplate(m.workoutTemplateId)?.name} · Open Workout
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5 border-t border-border p-2">
          {SUGGESTED_PROMPTS.map((p) => (
            <button
              key={p}
              onClick={() => handleSend(p)}
              className="rounded-full border border-border px-3 py-1.5 text-xs text-muted hover:bg-surface-2"
            >
              {p}
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
            placeholder="Ask your coach…"
            className="flex-1 rounded-full border border-border bg-surface-2 px-4 py-2 text-sm text-foreground outline-none focus:border-accent"
          />
          <button type="submit" className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-black hover:opacity-90">
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
