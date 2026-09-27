import { ScoreKey } from "./types";

/**
 * Single source of truth for how module scores roll up into the Global
 * Wellness Score. Change weights here only — never recompute independently
 * inside a module.
 */
export const SCORE_WEIGHTS: Record<ScoreKey, number> = {
  posture: 0.2,
  focus: 0.2,
  movement: 0.2,
  circadian: 0.2,
  recovery: 0.2,
};

export function computeGlobalScore(scores: Record<ScoreKey, number>): number {
  const total = (Object.keys(SCORE_WEIGHTS) as ScoreKey[]).reduce(
    (sum, key) => sum + scores[key] * SCORE_WEIGHTS[key],
    0
  );
  return Math.round(clamp(total, 0, 100));
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function applyScoreDelta(
  scores: Record<ScoreKey, number>,
  delta: Partial<Record<ScoreKey, number>>
): Record<ScoreKey, number> {
  const next = { ...scores };
  (Object.keys(delta) as ScoreKey[]).forEach((key) => {
    const change = delta[key];
    if (typeof change === "number") {
      next[key] = clamp(next[key] + change, 0, 100);
    }
  });
  return next;
}
