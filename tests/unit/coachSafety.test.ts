import { describe, expect, it } from "vitest";
import { detectSafetyConcern } from "@/lib/move/coachSafety";

describe("detectSafetyConcern", () => {
  it.each([
    ["I want to kill myself", "self_harm"],
    ["sometimes I think about suicide", "self_harm"],
    ["I've been starving myself to lose weight", "self_harm"],
    ["I have chest pain when I run", "medical_emergency"],
    ["I can't breathe after squats", "medical_emergency"],
    ["I fainted at the gym", "medical_emergency"],
  ])("flags %s", (text, expected) => {
    expect(detectSafetyConcern(text)).toBe(expected);
  });

  it.each(["How do I run 5 km faster?", "This workout is killing my legs", "Best stretch for tight hips?", "I want to breathe better while running"])(
    "lets normal questions through: %s",
    (text) => {
      expect(detectSafetyConcern(text)).toBeNull();
    }
  );
});
