import type { ScoreKey, WellnessEvent } from "../types";
import { SCORE_WEIGHTS, clamp } from "../scoring";

/**
 * The daily wellness score (spec: docs/wellness-score.md).
 *
 * - Every day starts empty. Nothing is shown that the user didn't do.
 * - Each action adds (or, for slouching and doomscrolling, removes) points
 *   on one or more dimensions, as listed in the event catalog.
 * - A dimension reaches 100 at DAILY_TARGET_POINTS; most actions are worth
 *   6–12 points, so roughly 3 actions fill a dimension for the day.
 * - The global score is the weighted average of all five dimensions, with
 *   untouched dimensions counting as 0: it measures how much of a well-rounded
 *   day you've had, not how good one area was.
 * - History keeps one score per day; the 7-day view averages the days you
 *   were active.
 */

export const SCORE_KEYS: ScoreKey[] = ["posture", "focus", "movement", "circadian", "recovery"];
export const DAILY_TARGET_POINTS = 24;
export const HISTORY_DAYS = 30;

export type Scores = Record<ScoreKey, number>;
export type Started = Record<ScoreKey, boolean>;

export interface DayScore {
  scores: Scores;
  /** Whether anything touched this dimension today (so "0" can read as "not started"). */
  started: Started;
  global: number;
  /** Any action today at all. */
  active: boolean;
}

export const EMPTY_SCORES: Scores = { posture: 0, focus: 0, movement: 0, circadian: 0, recovery: 0 };
const NOT_STARTED: Started = { posture: false, focus: false, movement: false, circadian: false, recovery: false };

/** Local calendar day, e.g. "2026-10-15" (not UTC: a day ends at the user's midnight). */
export function dayKey(date: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

export function computeDayScore(events: WellnessEvent[], day: string): DayScore {
  const points: Scores = { ...EMPTY_SCORES };
  const started: Started = { ...NOT_STARTED };
  let active = false;
  for (const e of events) {
    if (dayKey(new Date(e.timestamp)) !== day) continue;
    for (const key of Object.keys(e.scoreImpact) as ScoreKey[]) {
      const delta = e.scoreImpact[key];
      if (typeof delta !== "number" || delta === 0) continue;
      points[key] += delta;
      started[key] = true;
      active = true;
    }
  }
  const scores = { ...EMPTY_SCORES };
  for (const key of SCORE_KEYS) scores[key] = Math.round(clamp((points[key] / DAILY_TARGET_POINTS) * 100, 0, 100));
  const global = Math.round(SCORE_KEYS.reduce((sum, key) => sum + scores[key] * SCORE_WEIGHTS[key], 0));
  return { scores, started, global, active };
}

/** Average of the last 7 days (including today) on which the user did anything. */
export function weekAverage(history: Record<string, number>, today: string): { average: number | null; activeDays: number } {
  const days: number[] = [];
  const cursor = new Date(`${today}T12:00:00`);
  for (let i = 0; i < 7; i++) {
    const score = history[dayKey(cursor)];
    if (typeof score === "number") days.push(score);
    cursor.setDate(cursor.getDate() - 1);
  }
  if (days.length === 0) return { average: null, activeDays: 0 };
  return { average: Math.round(days.reduce((a, b) => a + b, 0) / days.length), activeDays: days.length };
}

/** Keeps only the last HISTORY_DAYS days of history. */
export function trimHistory(history: Record<string, number>): Record<string, number> {
  const keys = Object.keys(history).sort().slice(-HISTORY_DAYS);
  return Object.fromEntries(keys.map((k) => [k, history[k]]));
}
