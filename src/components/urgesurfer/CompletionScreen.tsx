"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { BreathingPattern, formatPattern } from "@/lib/breathing/types";

export function CompletionScreen({
  pattern,
  sessionDuration,
  cyclesCompleted,
  urgeBefore,
  urgeAfter,
  onRepeat,
  onChangePattern,
  onDone,
}: {
  pattern: BreathingPattern;
  sessionDuration: number;
  cyclesCompleted: number;
  urgeBefore: number | null;
  urgeAfter: number | null;
  onRepeat: () => void;
  onChangePattern: () => void;
  onDone: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center gap-4 text-center"
    >
      <span className="text-4xl">🌊</span>
      <h3 className="text-lg font-semibold text-foreground">Reset Complete</h3>
      <p className="text-sm text-muted">You completed {sessionDuration} seconds</p>

      <div className="rounded-xl bg-surface-2 px-4 py-2 text-sm text-foreground">
        {formatPattern(pattern)}
      </div>

      <div className="text-sm text-muted">
        Cycles completed <span className="font-semibold text-foreground">{cyclesCompleted}</span>
      </div>

      {urgeBefore != null && urgeAfter != null && (
        <div className="rounded-xl border border-border bg-surface-2 px-4 py-2 text-sm">
          <span className="text-muted">Urge </span>
          <span className="font-semibold text-foreground">
            {urgeBefore} → {urgeAfter}
          </span>
        </div>
      )}

      <Link
        href="/move/walk"
        className="rounded-full border border-accent/30 bg-accent/10 px-4 py-2 text-xs font-medium text-accent-foreground hover:bg-accent/20"
      >
        Ready for a short movement break?
      </Link>

      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <button
          onClick={onRepeat}
          className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-black hover:opacity-90"
        >
          Repeat
        </button>
        <button
          onClick={onChangePattern}
          className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-2"
        >
          Change Pattern
        </button>
        <button onClick={onDone} className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-2">
          Done
        </button>
      </div>
    </motion.div>
  );
}
