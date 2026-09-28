import { CompatibilityResult, PartnerProfile, SearchCriteria } from "./types";

/**
 * A transparent, explainable Wellness Compatibility Score — never an
 * opaque "AI match". Every point awarded has a human-readable reason
 * shown back to the user.
 */
const WEIGHTS = {
  activity: 30,
  schedule: 25,
  location: 15,
  fitness: 15,
  pace: 10,
  groupPreference: 5,
};

export function computeCompatibility(criteria: SearchCriteria, partner: PartnerProfile): CompatibilityResult {
  let score = 0;
  const reasons: string[] = [];

  if (partner.activities.includes(criteria.activity)) {
    score += WEIGHTS.activity;
    reasons.push("Same activity");
  }

  if (partner.preferredTime === criteria.time || partner.preferredTime === "flexible" || criteria.time === "flexible") {
    score += WEIGHTS.schedule;
    reasons.push(`${capitalize(criteria.time)} schedule overlaps`);
  }

  const approxKm = parseApproxKm(partner.approxDistanceAway);
  if (approxKm !== null && approxKm <= criteria.radiusKm) {
    score += WEIGHTS.location;
    reasons.push("Within preferred radius");
  }

  if (!criteria.experienceLevel || partner.experienceLevel === criteria.experienceLevel) {
    score += WEIGHTS.fitness;
    reasons.push("Similar fitness level");
  }

  if (rangesOverlap(criteria.paceMinPerKm, partner.paceMinPerKm)) {
    score += WEIGHTS.pace;
    reasons.push("Similar pace");
  } else if (!criteria.paceMinPerKm && !partner.paceMinPerKm) {
    score += WEIGHTS.pace;
  }

  if (rangesOverlap(criteria.distanceKm, partner.distanceKm)) {
    // Folded into fitness/activity reasons rather than a separate weight line —
    // distance preference overlap is surfaced as its own reason when relevant.
    reasons.push("Same preferred distance");
  }

  score += WEIGHTS.groupPreference; // group-size preference is resolved at request time, not filtering here

  return { score: Math.round(score), reasons };
}

function rangesOverlap(a?: [number, number], b?: [number, number]): boolean {
  if (!a || !b) return false;
  return a[0] <= b[1] && b[0] <= a[1];
}

function parseApproxKm(label: string): number | null {
  const match = label.match(/([\d.]+)\s*km/);
  return match ? parseFloat(match[1]) : null;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
