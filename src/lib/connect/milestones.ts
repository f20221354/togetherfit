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
import type { IconName } from "@/components/ui/Icon";

export type MilestoneMetric = "total" | "streak" | "withConnection" | "group";

export interface MilestoneDef {
  key: string;
  title: string;
  description: string;
  icon: IconName;
  metric: MilestoneMetric;
  target: number;
}

export const MILESTONES: MilestoneDef[] = [
  { key: "first_activity", title: "First activity", description: "Completed your first activity", icon: "object.sprout", metric: "total", target: 1 },
  { key: "sessions_10", title: "10 activities", description: "Completed 10 activities", icon: "status.energy", metric: "total", target: 10 },
  { key: "streak_3", title: "3-day streak", description: "Active 3 days in a row", icon: "reaction.fire", metric: "streak", target: 3 },
  { key: "streak_7", title: "7-day streak", description: "Active 7 days in a row", icon: "status.energy", metric: "streak", target: 7 },
  { key: "streak_30", title: "30-day streak", description: "Active 30 days in a row", icon: "object.trophy", metric: "streak", target: 30 },
  { key: "connection_10", title: "10 sessions together", description: "10 sessions with the same friend", icon: "nav.connect", metric: "withConnection", target: 10 },
  { key: "first_group", title: "First group activity", description: "Completed your first group activity", icon: "people.friends", metric: "group", target: 1 },
];

export function milestoneDef(key: string): MilestoneDef | undefined {
  return MILESTONES.find((m) => m.key === key);
}

/** Reactions a receiver can send back on a celebration card (stored by key, drawn as icons). */
export const CELEBRATION_REACTIONS = ["fire", "clap", "strong", "love", "party"] as const;
export type CelebrationReaction = (typeof CELEBRATION_REACTIONS)[number];

export const REACTION_META: Record<CelebrationReaction, { icon: IconName; label: string }> = {
  fire: { icon: "reaction.fire", label: "Fire" },
  clap: { icon: "reaction.clap", label: "Applause" },
  strong: { icon: "reaction.strong", label: "Strong" },
  love: { icon: "reaction.love", label: "Love" },
  party: { icon: "status.celebrate", label: "Celebrate" },
};

/** The icon for a card, from its milestone (older cards stored an emoji, which is ignored). */
export function cardIcon(card: { key: string }): IconName {
  return milestoneDef(card.key)?.icon ?? "object.medal";
}

export function isReaction(value: string | null | undefined): value is CelebrationReaction {
  return !!value && (CELEBRATION_REACTIONS as readonly string[]).includes(value);
}

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
