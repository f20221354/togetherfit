"use client";

import { motion, MotionValue } from "framer-motion";
import { BreathingPhase, PHASE_LABELS } from "@/lib/breathing/types";

export function BreathingCircle({
  scale,
  phase,
  countdown,
  idleLabel,
}: {
  scale: MotionValue<number>;
  phase: BreathingPhase | null;
  countdown: number | null;
  idleLabel?: string;
}) {
  return (
    <div className="relative flex h-64 w-64 items-center justify-center">
      <div className="absolute h-full w-full rounded-full bg-accent/10 blur-2xl" />
      <motion.div
        style={{ scale }}
        className="absolute h-48 w-48 rounded-full bg-gradient-to-br from-accent/25 to-accent/5 shadow-[0_0_60px_-10px_var(--accent)]"
      />
      <motion.div style={{ scale }} className="absolute h-48 w-48 rounded-full border border-accent/30" />
      <div className="relative z-10 flex flex-col items-center gap-1 text-center">
        {phase && countdown !== null ? (
          <>
            <span className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">
              {PHASE_LABELS[phase]}
            </span>
            <span className="text-4xl font-semibold tabular-nums text-foreground">
              {countdown.toString().padStart(2, "0")}
            </span>
            <span className="text-[11px] text-muted">seconds left</span>
          </>
        ) : (
          <span className="max-w-[8rem] text-sm text-muted">{idleLabel ?? "Ready when you are"}</span>
        )}
      </div>
    </div>
  );
}
