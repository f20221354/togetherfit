"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import clsx from "clsx";

const STEPS = [
  { count: 5, label: "things you can see", icon: "👁" },
  { count: 4, label: "things you can touch", icon: "✋" },
  { count: 3, label: "things you can hear", icon: "👂" },
  { count: 2, label: "things you can smell", icon: "👃" },
  { count: 1, label: "thing you can taste", icon: "👅" },
];

export function GroundingReset({ onComplete }: { onComplete: () => void }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [checked, setChecked] = useState<boolean[]>(() => Array(STEPS[0].count).fill(false));

  const step = STEPS[stepIndex];
  const allChecked = checked.every(Boolean);

  function toggle(i: number) {
    setChecked((prev) => prev.map((v, idx) => (idx === i ? !v : v)));
  }

  function next() {
    if (stepIndex + 1 < STEPS.length) {
      const nextIndex = stepIndex + 1;
      setStepIndex(nextIndex);
      setChecked(Array(STEPS[nextIndex].count).fill(false));
    } else {
      onComplete();
    }
  }

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="flex gap-1.5">
        {STEPS.map((_, i) => (
          <span key={i} className={clsx("h-1.5 w-8 rounded-full", i <= stepIndex ? "bg-accent" : "bg-surface-2")} />
        ))}
      </div>

      <motion.div
        key={stepIndex}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col items-center gap-4 text-center"
      >
        <span className="text-4xl">{step.icon}</span>
        <div className="text-2xl font-semibold text-foreground">{step.count}</div>
        <div className="text-sm text-muted">{step.label}</div>

        <div className="flex flex-wrap justify-center gap-2">
          {checked.map((isChecked, i) => (
            <button
              key={i}
              onClick={() => toggle(i)}
              className={clsx(
                "flex h-10 w-10 items-center justify-center rounded-full border text-sm font-medium transition-colors",
                isChecked ? "border-accent bg-accent/15 text-accent-foreground" : "border-border text-muted hover:text-foreground"
              )}
            >
              {i + 1}
            </button>
          ))}
        </div>
        <p className="max-w-xs text-xs text-muted">Tap each number as you notice one.</p>
      </motion.div>

      <button
        onClick={next}
        disabled={!allChecked}
        className="rounded-full bg-accent px-6 py-2 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-40"
      >
        {stepIndex + 1 < STEPS.length ? "Next" : "Finish"}
      </button>
    </div>
  );
}
