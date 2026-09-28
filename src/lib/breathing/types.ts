export type BreathingPhase = "inhale" | "holdAfterInhale" | "exhale" | "holdAfterExhale";

/** Every duration is user-controlled seconds. 4s is only ever a default value, never a limit. */
export interface BreathingPattern {
  inhale: number;
  holdAfterInhale: number;
  exhale: number;
  holdAfterExhale: number;
}

export const PHASE_ORDER: BreathingPhase[] = ["inhale", "holdAfterInhale", "exhale", "holdAfterExhale"];

export const PHASE_LABELS: Record<BreathingPhase, string> = {
  inhale: "Breathe In",
  holdAfterInhale: "Hold",
  exhale: "Breathe Out",
  holdAfterExhale: "Hold",
};

export function cycleLength(pattern: BreathingPattern): number {
  return pattern.inhale + pattern.holdAfterInhale + pattern.exhale + pattern.holdAfterExhale;
}

export function phaseDuration(pattern: BreathingPattern, phase: BreathingPhase): number {
  return pattern[phase];
}

export interface SavedPattern {
  id: string;
  name: string;
  icon: string;
  pattern: BreathingPattern;
}

export interface SessionHistoryEntry {
  id: string;
  timestamp: string;
  pattern: BreathingPattern;
  sessionDuration: number;
  cyclesCompleted: number;
  completed: boolean;
  urgeBefore?: number;
  urgeAfter?: number;
}

export function formatPattern(pattern: BreathingPattern): string {
  return `${pattern.inhale} · ${pattern.holdAfterInhale} · ${pattern.exhale} · ${pattern.holdAfterExhale}`;
}
