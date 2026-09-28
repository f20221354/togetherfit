export type ModuleKey = "sanctuary" | "posture" | "urgesurfer" | "circadian" | "move" | "connect";

export type ScoreKey = "posture" | "focus" | "movement" | "circadian" | "recovery";

export type EventType =
  | "sunlight_completed"
  | "walk_completed"
  | "breathing_completed"
  | "grounding_completed"
  | "hydration_logged"
  | "posture_corrected"
  | "slouch_detected"
  | "doomscroll_detected"
  | "focus_session_completed"
  | "sleep_window_completed"
  | "urge_reset_completed"
  | "morning_light_completed"
  | "evening_dim_recommended"
  | "eye_level_warning"
  | "posture_alignment_restored"
  | "run_completed"
  | "gym_session_completed"
  | "cycling_completed"
  | "yoga_completed"
  | "sports_completed"
  | "hiking_completed"
  | "group_activity_completed"
  | "workout_completed"
  | "trainer_session_completed"
  | "rhythm_reset_completed";

export type EventSeverity = "positive" | "info" | "warning";

export interface WellnessEvent {
  id: string;
  timestamp: string;
  module: ModuleKey;
  type: EventType;
  severity: EventSeverity;
  label: string;
  duration?: number;
  scoreImpact: Partial<Record<ScoreKey, number>>;
}

export interface Habits {
  hydrated: boolean;
  stretched: boolean;
  sunlightWalk: boolean;
  noDoomscroll: boolean;
}

export interface RecommendationCard {
  id: string;
  reason: string;
  metric: string;
  action: string;
  ctaLabel: string;
  destination: ModuleKey;
}

export type ThemeMode = "light" | "dark";
