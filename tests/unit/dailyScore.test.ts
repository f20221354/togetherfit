import { describe, expect, it } from "vitest";
import { computeDayScore, dayKey, weekAverage } from "@/lib/wellness/dailyScore";
import type { WellnessEvent } from "@/lib/types";

const today = dayKey();
const yesterday = (() => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d;
})();

function event(scoreImpact: WellnessEvent["scoreImpact"], when = new Date()): WellnessEvent {
  return { id: Math.random().toString(36), timestamp: when.toISOString(), module: "move", type: "walk_completed", severity: "positive", label: "", scoreImpact };
}

describe("computeDayScore", () => {
  it("shows nothing before the first action", () => {
    const day = computeDayScore([], today);
    expect(day.active).toBe(false);
    expect(day.global).toBe(0);
    expect(Object.values(day.started).some(Boolean)).toBe(false);
  });

  it("scores one walk against the 24-point daily target", () => {
    const day = computeDayScore([event({ movement: 10, circadian: 6, recovery: 3 })], today);
    expect(day.scores.movement).toBe(42);
    expect(day.scores.circadian).toBe(25);
    expect(day.started.posture).toBe(false);
    expect(day.global).toBe(Math.round((42 + 25 + 13) / 5));
  });

  it("ignores yesterday's actions", () => {
    expect(computeDayScore([event({ movement: 10 }, yesterday)], today).active).toBe(false);
  });

  it("caps at 100 and floors at 0", () => {
    expect(computeDayScore([event({ movement: 30 }), event({ movement: 30 })], today).scores.movement).toBe(100);
    const slouch = computeDayScore([event({ posture: -8 })], today);
    expect(slouch.scores.posture).toBe(0);
    expect(slouch.started.posture).toBe(true);
  });
});

describe("weekAverage", () => {
  it("averages only active days", () => {
    expect(weekAverage({ [today]: 40, [dayKey(yesterday)]: 60 }, today)).toEqual({ average: 50, activeDays: 2 });
  });

  it("is empty with no history", () => {
    expect(weekAverage({}, today)).toEqual({ average: null, activeDays: 0 });
  });
});
