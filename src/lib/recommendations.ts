import { RecommendationCard, ScoreKey } from "./types";

interface RecommendationInputs {
  scores: Record<ScoreKey, number>;
  started: Record<ScoreKey, boolean>;
  activeToday: boolean;
  eveningLightHigh: boolean;
  prolongedGaze: boolean;
}

/**
 * Suggests the module most likely to help today, using only what actually
 * happened today: nothing is claimed that the app didn't observe.
 */
export function getRecommendations(inputs: RecommendationInputs): RecommendationCard[] {
  const cards: RecommendationCard[] = [];
  const { scores, started, activeToday, eveningLightHigh, prolongedGaze } = inputs;

  if (prolongedGaze) {
    cards.push({
      id: "rec_gaze",
      reason: "Posture Guard noticed a long stretch of slouching or screen time without a break.",
      metric: `Focus today: ${scores.focus}`,
      action: "Take a 90-second reset or a short walk to break the loop.",
      ctaLabel: "Start 90s Reset",
      destination: "urgesurfer",
    });
  }

  if (started.posture && scores.posture < 50) {
    cards.push({
      id: "rec_posture",
      reason: "Your posture score is low today.",
      metric: `Posture today: ${scores.posture}`,
      action: "Run a posture check and correct your position when it nudges you.",
      ctaLabel: "Check Posture",
      destination: "posture",
    });
  }

  if (scores.movement < 50) {
    cards.push({
      id: "rec_move",
      reason: started.movement ? "You've moved a little today. A bit more fills your movement score." : "You haven't logged any movement today.",
      metric: started.movement ? `Movement today: ${scores.movement}` : "Movement: not started",
      action: "A 15-minute walk raises movement and daylight together.",
      ctaLabel: "Start a Walk",
      destination: "move",
    });
  }

  if (!activeToday && !started.recovery) {
    cards.push({
      id: "rec_reset",
      reason: "Your day starts with one small action.",
      metric: "Recovery: not started",
      action: "Try a 90-second breathing reset. It counts towards recovery and focus.",
      ctaLabel: "Start 90s Reset",
      destination: "urgesurfer",
    });
  }

  if (eveningLightHigh) {
    cards.push({
      id: "rec_dim",
      reason: "It's evening and your light exposure is still high.",
      metric: `Circadian today: ${scores.circadian}`,
      action: "Dim your screens and lights to protect tonight's sleep window.",
      ctaLabel: "View Circadian Plan",
      destination: "circadian",
    });
  }

  return cards.slice(0, 3);
}
