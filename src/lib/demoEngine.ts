import { EventType } from "./types";

/**
 * Demo Mode drives the whole ecosystem, not one module at a time. Each tick
 * fires one realistic event; the store's shared scoring/event pipeline is
 * what actually propagates the effect across Sanctuary, the module cards,
 * charts, and the Activity Explorer.
 */
export const DEMO_EVENT_SEQUENCE: EventType[] = [
  "morning_light_completed",
  "hydration_logged",
  "focus_session_completed",
  "slouch_detected",
  "doomscroll_detected",
  "urge_reset_completed",
  "posture_corrected",
  "walk_completed",
  "sunlight_completed",
  "focus_session_completed",
  "evening_dim_recommended",
  "sleep_window_completed",
];

export function pickNextDemoEvent(tickIndex: number): EventType {
  return DEMO_EVENT_SEQUENCE[tickIndex % DEMO_EVENT_SEQUENCE.length];
}
