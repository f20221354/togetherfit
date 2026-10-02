/**
 * Winter Arc — the single source of truth for the seasonal event.
 *
 * Every date check, copy string and link for Winter Arc reads from this file.
 * To move the event, change the two dates below; to change wording, edit
 * WINTER_ARC_COPY. Nothing else in the app hard-codes Winter Arc dates.
 *
 * Dates are calendar days in the viewer's local time zone. Both are
 * inclusive: the event is live from the start of START_DATE through the end
 * of END_DATE ("3 calendar months": Oct 1 → Dec 31, over from Jan 1).
 */

export const WINTER_ARC_START_DATE = "2026-10-01";
export const WINTER_ARC_END_DATE = "2026-12-31";

/** Same-app route (src/app/(dashboard)/connect/find), so it's an internal link. */
export const WINTER_ARC_PARTNER_FINDER_PATH = "/connect/find";
export const WINTER_ARC_PAGE_PATH = "/move/winter-arc";

// Launch copy (the original placeholders, approved as-is). Edit here to change any wording.
export const WINTER_ARC_COPY = {
  title: "Winter Arc",
  hook: "Three months. One version of you that doesn't take winter off.",
  badge: "Limited-time event — 3 months",
  description:
    "Train, reset and show up every day from October to December. Every workout you log counts toward your Winter Arc, and you don't have to do it alone.",
  joinCta: "Join Winter Arc",
  dismissCta: "Maybe later",
  joinedTitle: "Winter Arc is live",
  goToCta: "Go to Winter Arc",
  navBadge: "Limited Time",
  findPartnerCta: "Find Your Arc Partner",
  rules: [
    "Log at least one workout or walk on as many days as you can.",
    "Protect your streak: a missed day resets it, so plan rest days on purpose.",
    "Find an Arc Partner in Connect and keep each other accountable.",
    "Check in on this page to see your Winter Arc progress.",
  ],
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** "YYYY-MM-DD" → local midnight of that day. */
function localDay(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Whole calendar days from a to b (DST-safe: rounds the 23/25-hour days). */
function daysBetween(a: Date, b: Date): number {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / DAY_MS);
}

export const winterArcStart = () => localDay(WINTER_ARC_START_DATE);
export const winterArcEnd = () => localDay(WINTER_ARC_END_DATE);

/** Length of the event in days, counting both the first and last day (92 for Oct 1 → Dec 31). */
export const winterArcTotalDays = () => daysBetween(winterArcStart(), winterArcEnd()) + 1;

/** True from the first moment of START_DATE through the last moment of END_DATE. */
export function isWinterArcActive(now: Date = new Date()): boolean {
  const day = daysBetween(winterArcStart(), now);
  return day >= 0 && day < winterArcTotalDays();
}

/** 1-based day of the event ("Day X of N"), clamped to [1, N]. */
export function winterArcDay(now: Date = new Date()): number {
  return Math.min(winterArcTotalDays(), Math.max(1, daysBetween(winterArcStart(), now) + 1));
}

/** Days left after today (0 on the last day). */
export function winterArcDaysRemaining(now: Date = new Date()): number {
  return Math.max(0, daysBetween(now, winterArcEnd()));
}

/** True if an ISO timestamp falls on a day inside the event window. */
export function isWithinWinterArc(iso: string): boolean {
  return isWinterArcActive(new Date(iso));
}

export type WinterArcPhase = "upcoming" | "active" | "ended";

export function winterArcPhase(now: Date = new Date()): WinterArcPhase {
  if (isWinterArcActive(now)) return "active";
  return daysBetween(winterArcStart(), now) < 0 ? "upcoming" : "ended";
}
