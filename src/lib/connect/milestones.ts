/**
 * Milestones worth celebrating. Each one is a metric plus a target, so
 * adding a milestone is one line here — the server evaluates them
 * generically after every logged activity (src/lib/network/milestonesDb.ts).
 *
 * Metrics:
 * - total:          all activities you've completed
 * - streak:         consecutive days with at least one activity (India time)
 * - withConnection: activities logged together with one friend
 * - group:          activities logged from a group chat
 */
export type MilestoneMetric = "total" | "streak" | "withConnection" | "group";

export interface MilestoneDef {
  key: string;
  title: string;
  description: string;
  icon: string;
  metric: MilestoneMetric;
  target: number;
}

export const MILESTONES: MilestoneDef[] = [
  { key: "first_activity", title: "First activity", description: "Completed your first activity", icon: "🌱", metric: "total", target: 1 },
  { key: "sessions_10", title: "10 activities", description: "Completed 10 activities", icon: "💪", metric: "total", target: 10 },
  { key: "streak_3", title: "3-day streak", description: "Active 3 days in a row", icon: "🔥", metric: "streak", target: 3 },
  { key: "streak_7", title: "7-day streak", description: "Active 7 days in a row", icon: "⚡", metric: "streak", target: 7 },
  { key: "streak_30", title: "30-day streak", description: "Active 30 days in a row", icon: "🏆", metric: "streak", target: 30 },
  { key: "connection_10", title: "10 sessions together", description: "10 sessions with the same friend", icon: "🤝", metric: "withConnection", target: 10 },
  { key: "first_group", title: "First group activity", description: "Completed your first group activity", icon: "👥", metric: "group", target: 1 },
];

export function milestoneDef(key: string): MilestoneDef | undefined {
  return MILESTONES.find((m) => m.key === key);
}

/** Emoji a receiver can react to a celebration card with. */
export const CELEBRATION_REACTIONS = ["🔥", "👏", "💪", "❤️", "🎉"];

/** What a celebration card shows — also the JSON body of a celebration message. */
export interface CelebrationCard {
  milestoneId: string;
  key: string;
  title: string;
  description: string;
  icon: string;
  sport: string | null;
  achievedAt: string;
  userName: string;
}
