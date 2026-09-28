"use client";

import { ProgressBar } from "./ProgressBar";

export function ManualCounter({
  icon,
  label,
  value,
  target,
  unit,
  step = 1,
  onChange,
}: {
  icon: string;
  label: string;
  value: number;
  target: number;
  unit: string;
  step?: number;
  onChange: (value: number) => void;
}) {
  const pct = Math.min(100, Math.round((value / target) * 100));
  const met = value >= target;

  return (
    <div
      className={
        "flex flex-col gap-2 rounded-2xl border p-4 " +
        (met ? "border-accent/40 bg-accent/10" : "border-border bg-surface")
      }
    >
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <span className="text-xl">{icon}</span>
        {label}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(value - step)}
          className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-sm text-foreground hover:bg-surface-2"
          aria-label={`Decrease ${label}`}
        >
          −
        </button>
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-14 rounded-lg border border-border bg-surface-2 px-2 py-1 text-center text-sm text-foreground"
          aria-label={`${label} (${unit})`}
        />
        <button
          onClick={() => onChange(value + step)}
          className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-sm text-foreground hover:bg-surface-2"
          aria-label={`Increase ${label}`}
        >
          +
        </button>
        <span className="text-xs text-muted">
          / {target} {unit}
        </span>
      </div>

      <ProgressBar value={pct} tone={met ? "good" : "default"} />
    </div>
  );
}
