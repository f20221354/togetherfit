import { BreathingPattern } from "./types";

export interface BreathingPreset {
  label: string;
  pattern: BreathingPattern;
}

function square(n: number): BreathingPattern {
  return { inhale: n, holdAfterInhale: n, exhale: n, holdAfterExhale: n };
}

/** 4-4-4-4 is only the first entry / default — never a ceiling. */
export const BREATHING_PRESETS: BreathingPreset[] = [
  { label: "4-4-4-4", pattern: square(4) },
  { label: "5-5-5-5", pattern: square(5) },
  { label: "10-10-10-10", pattern: square(10) },
  { label: "15-15-15-15", pattern: square(15) },
  { label: "20-20-20-20", pattern: square(20) },
];

export const DEFAULT_PATTERN: BreathingPattern = BREATHING_PRESETS[0].pattern;

export const SESSION_DURATION_OPTIONS = [30, 60, 90, 120, 180] as const;
export const DEFAULT_SESSION_DURATION = 90;

export function matchingPresetLabel(pattern: BreathingPattern): string | null {
  const match = BREATHING_PRESETS.find(
    (p) =>
      p.pattern.inhale === pattern.inhale &&
      p.pattern.holdAfterInhale === pattern.holdAfterInhale &&
      p.pattern.exhale === pattern.exhale &&
      p.pattern.holdAfterExhale === pattern.holdAfterExhale
  );
  return match?.label ?? null;
}
