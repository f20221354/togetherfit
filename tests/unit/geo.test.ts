import { describe, expect, it } from "vitest";
import { approxDistanceKm, coarsen, jitter } from "@/lib/network/geo";

describe("approxDistanceKm", () => {
  it("uses coarse bands", () => {
    expect(approxDistanceKm(0.2)).toBe(1);
    expect(approxDistanceKm(0.99)).toBe(1);
    expect(approxDistanceKm(1.2)).toBe(2);
    expect(approxDistanceKm(4.9)).toBe(5);
    expect(approxDistanceKm(6)).toBe(10);
    expect(approxDistanceKm(12)).toBe(15);
  });
});

describe("jitter", () => {
  it("moves the point by at most ~250 m, differently each time", () => {
    const base = coarsen(12.9716, 77.5946);
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const p = jitter(base.lat, base.lng);
      const dy = (p.lat - base.lat) * 111_320;
      const dx = (p.lng - base.lng) * 111_320 * Math.cos((base.lat * Math.PI) / 180);
      expect(Math.hypot(dx, dy)).toBeLessThanOrEqual(270); // 250 m plus rounding to 4 decimals
      seen.add(`${p.lat},${p.lng}`);
    }
    expect(seen.size).toBeGreaterThan(100);
  });
});
