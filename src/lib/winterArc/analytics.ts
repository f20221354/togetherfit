/**
 * Minimal Winter Arc event logger. The repo had no analytics provider, so
 * events go to our own Postgres (POST /api/winter-arc/events → the
 * winter_arc_events table); /admin/winter-arc aggregates them.
 *
 * Nothing is throttled except winter_arc_daily_active, which by definition
 * is once per user per day.
 *
 * No "use client" on purpose: the server imports WINTER_ARC_EVENTS to
 * validate events, and the helpers below only run from client components.
 */

export const WINTER_ARC_EVENTS = [
  "winter_arc_popup_shown",
  "winter_arc_joined",
  "winter_arc_dismissed",
  "winter_arc_page_viewed",
  "winter_arc_find_partner_clicked",
  "winter_arc_daily_active",
] as const;

export type WinterArcEvent = (typeof WINTER_ARC_EVENTS)[number];

export function trackWinterArc(event: WinterArcEvent, email: string | undefined, props?: Record<string, unknown>) {
  if (!email) return;
  try {
    // keepalive lets the request finish even when the click navigates away.
    void fetch("/api/winter-arc/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, email, props }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Analytics must never break the UI.
  }
}

function localDateKey(now = new Date()) {
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

/**
 * Logs winter_arc_daily_active the first time today that the user engages
 * with Winter Arc content (joins, opens the page, clicks the partner CTA…).
 * The server also dedupes per user per day, so this is only a request saver.
 */
export function markWinterArcDailyActive(email: string | undefined) {
  if (!email) return;
  const key = `vitaos-winter-arc-active:${email}`;
  const today = localDateKey();
  try {
    if (localStorage.getItem(key) === today) return;
    localStorage.setItem(key, today);
  } catch {
    // Storage blocked: fall through and let the server dedupe.
  }
  trackWinterArc("winter_arc_daily_active", email);
}
