"use client";

import clsx from "clsx";
import { BreathingPattern, PHASE_LABELS, PHASE_ORDER } from "@/lib/breathing/types";
import { BREATHING_PRESETS, matchingPresetLabel } from "@/lib/breathing/presets";

const MIN_SECONDS = 1;
const MAX_SECONDS = 120;

function clampSeconds(value: number): number {
  if (!Number.isFinite(value)) return MIN_SECONDS;
  return Math.min(MAX_SECONDS, Math.max(MIN_SECONDS, Math.round(value)));
}

export function PatternEditor({
  pattern,
  onChange,
  disabled,
}: {
  pattern: BreathingPattern;
  onChange: (pattern: BreathingPattern) => void;
  disabled?: boolean;
}) {
  const activePreset = matchingPresetLabel(pattern);

  function setPhase(phase: keyof BreathingPattern, value: number) {
    onChange({ ...pattern, [phase]: clampSeconds(value) });
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted">Quick Presets</div>
        <div className="flex flex-wrap gap-2">
          {BREATHING_PRESETS.map((preset) => (
            <button
              key={preset.label}
              disabled={disabled}
              onClick={() => onChange(preset.pattern)}
              className={clsx(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50",
                activePreset === preset.label
                  ? "border-accent bg-accent/10 text-accent-foreground"
                  : "border-border text-muted hover:text-foreground"
              )}
            >
              {preset.label}
            </button>
          ))}
          <span
            className={clsx(
              "rounded-full border px-3 py-1.5 text-xs font-medium",
              !activePreset ? "border-accent bg-accent/10 text-accent-foreground" : "border-border text-muted"
            )}
          >
            Custom
          </span>
        </div>
      </div>

      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted">Customize Your Breath</div>
        <div className="flex flex-col gap-2">
          {PHASE_ORDER.map((phase) => (
            <div key={phase} className="flex items-center justify-between gap-3 rounded-xl bg-surface-2 px-3 py-2">
              <span className="text-sm text-foreground">{PHASE_LABELS[phase]}</span>
              <div className="flex items-center gap-2">
                <button
                  disabled={disabled}
                  onClick={() => setPhase(phase, pattern[phase] - 1)}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-sm text-foreground hover:bg-surface disabled:opacity-50"
                  aria-label={`Decrease ${PHASE_LABELS[phase]}`}
                >
                  −
                </button>
                <input
                  type="number"
                  min={MIN_SECONDS}
                  max={MAX_SECONDS}
                  value={pattern[phase]}
                  disabled={disabled}
                  onChange={(e) => setPhase(phase, Number(e.target.value))}
                  className="w-14 rounded-lg border border-border bg-surface px-2 py-1 text-center text-sm text-foreground disabled:opacity-50"
                />
                <span className="w-3 text-xs text-muted">s</span>
                <button
                  disabled={disabled}
                  onClick={() => setPhase(phase, pattern[phase] + 1)}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-sm text-foreground hover:bg-surface disabled:opacity-50"
                  aria-label={`Increase ${PHASE_LABELS[phase]}`}
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
