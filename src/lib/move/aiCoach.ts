import { Goal, WorkoutSession } from "./types";
import { WORKOUT_TEMPLATES } from "./workoutTemplates";

export interface CoachContext {
  goals: Goal[];
  workoutHistory: WorkoutSession[];
  preferredHour: number | null; // 0-23, derived from history
}

export interface CoachSuggestion {
  message: string;
  ctaLabel?: string;
  workoutTemplateId?: string;
  scheduleHour?: number;
}

function isThisWeek(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;
  const diffDays = Math.floor((now.getTime() - d.getTime()) / dayMs);
  return diffDays >= 0 && diffDays < 7;
}

/**
 * Every suggestion here is derived directly from stored goals/history —
 * "suggested based on your activity history", never a claim of clinical
 * or medical expertise.
 */
export function getCoachSuggestions(ctx: CoachContext): CoachSuggestion[] {
  const suggestions: CoachSuggestion[] = [];
  const thisWeekSessions = ctx.workoutHistory.filter((s) => isThisWeek(s.timestamp) && s.completed);

  const consistencyGoal = ctx.goals.find((g) => g.type === "frequency" || g.type === "consistency");
  if (consistencyGoal) {
    const planned = consistencyGoal.frequencyPerWeek ?? consistencyGoal.target;
    const completed = thisWeekSessions.length;
    if (completed < planned) {
      suggestions.push({
        message: `You planned ${planned} workouts this week and completed ${completed}. You have ${planned - completed} remaining session${planned - completed === 1 ? "" : "s"}.`,
        ctaLabel: "Start Workout",
        workoutTemplateId: "lower-body-20",
      });
    }
  }

  if (ctx.preferredHour !== null) {
    suggestions.push({
      message: `You usually exercise around ${formatHour(ctx.preferredHour)}. Would you like to schedule today's workout?`,
      ctaLabel: `Schedule ${formatHour(ctx.preferredHour)}`,
      scheduleHour: ctx.preferredHour,
    });
  }

  const runGoal = ctx.goals.find((g) => g.label.toLowerCase().includes("run"));
  if (runGoal && runGoal.current < runGoal.target) {
    const remaining = runGoal.target - runGoal.current;
    suggestions.push({
      message: `You're ${remaining} ${runGoal.unit} away from your "${runGoal.label}" goal.`,
      ctaLabel: "Ask Coach",
    });
  }

  if (suggestions.length === 0) {
    suggestions.push({
      message: "You're on track. A short full-body session would keep the momentum going.",
      ctaLabel: "Start Workout",
      workoutTemplateId: "bodyweight-15",
    });
  }

  return suggestions.slice(0, 2);
}

function formatHour(hour: number): string {
  const h = hour % 12 === 0 ? 12 : hour % 12;
  const period = hour < 12 ? "AM" : "PM";
  return `${h}:00 ${period}`;
}

export interface CoachChatReply {
  text: string;
  ctaLabel?: string;
  workoutTemplateId?: string;
}

/**
 * A deterministic, keyword-matched responder — not a real LLM call. This
 * keeps the prototype transparent about what "AI Coach" means today while
 * leaving room for a real model to replace this function later without
 * changing the chat UI.
 */
export function respondToCoachPrompt(prompt: string): CoachChatReply {
  const text = prompt.toLowerCase();

  if (text.includes("20 min") || text.includes("20-min")) {
    return {
      text: "Based on your current goal, you could do a 20-minute full-body strength session.",
      ctaLabel: "Start 20-Min Workout",
      workoutTemplateId: "lower-body-20",
    };
  }

  if (text.includes("no gym") || text.includes("home") || text.includes("bodyweight")) {
    return {
      text: "No problem. Here's a bodyweight version you can do anywhere.",
      ctaLabel: "Start Bodyweight Workout",
      workoutTemplateId: "bodyweight-15",
    };
  }

  if (text.includes("missed")) {
    return {
      text: "That's okay — consistency matters more than any single session. Want to pick it back up with a short workout today?",
      ctaLabel: "Start Workout",
      workoutTemplateId: "bodyweight-15",
    };
  }

  if (text.includes("running") || text.includes("run")) {
    return {
      text: "For your running goal, pairing short runs with a lower-body strength session tends to help. Want a lower-body session today?",
      ctaLabel: "Start Lower Body Workout",
      workoutTemplateId: "lower-body-20",
    };
  }

  if (text.includes("beginner")) {
    return {
      text: "Here's a beginner-friendly full-body session — nothing overly intense, just consistent movement.",
      ctaLabel: "Start Full Body Workout",
      workoutTemplateId: "full-body-25",
    };
  }

  if (text.includes("30")) {
    return {
      text: "A 30-minute full-body session fits well here.",
      ctaLabel: "Start Full Body Workout",
      workoutTemplateId: "full-body-25",
    };
  }

  if (text.includes("core") || text.includes("abs")) {
    return {
      text: "Here's a core-focused session.",
      ctaLabel: "Start Core Workout",
      workoutTemplateId: "core-15",
    };
  }

  if (text.includes("stretch") || text.includes("mobility") || text.includes("cooldown")) {
    return {
      text: "Here's a short mobility and cooldown routine.",
      ctaLabel: "Start Mobility Session",
      workoutTemplateId: "mobility-10",
    };
  }

  return {
    text: "Based on your recent activity, a full-body session is a solid default for today.",
    ctaLabel: "Start Full Body Workout",
    workoutTemplateId: WORKOUT_TEMPLATES[0].id,
  };
}
