import { RecommendationCard, ScoreKey } from "./types";

interface RecommendationInputs {
  scores: Record<ScoreKey, number>;
  minutesSincePostureCorrection: number;
  eveningLightHigh: boolean;
  prolongedGaze: boolean;
}

/**
 * VitaOS recommends the module most likely to move the metric that is
 * currently dragging the Global Wellness Score down.
 */
export function getRecommendations(inputs: RecommendationInputs): RecommendationCard[] {
  const cards: RecommendationCard[] = [];
  const { scores, minutesSincePostureCorrection, eveningLightHigh, prolongedGaze } = inputs;

  if (scores.posture < 70 || minutesSincePostureCorrection >= 25) {
    cards.push({
      id: "rec_posture",
      reason: `Your posture has declined for ${minutesSincePostureCorrection} minutes.`,
      metric: `Posture score: ${scores.posture}`,
      action: "Take a 90-second UrgeSurfer reset to release tension and reset your posture.",
      ctaLabel: "Start 90s Reset",
      destination: "urgesurfer",
    });
  }

  if (scores.movement < 70) {
    cards.push({
      id: "rec_sunlight",
      reason: "You haven't reached your morning sunlight target.",
      metric: `Movement score: ${scores.movement}`,
      action: "Try a 15-minute walk from Move & Coach to raise your sunlight and movement scores together.",
      ctaLabel: "Start Sunlight Walk",
      destination: "move",
    });
  }

  if (eveningLightHigh) {
    cards.push({
      id: "rec_dim",
      reason: "Your Circadian Arc suggests dimming your environment.",
      metric: `Circadian score: ${scores.circadian}`,
      action: "Lower evening light exposure to protect tonight's sleep window.",
      ctaLabel: "View Circadian Plan",
      destination: "circadian",
    });
  }

  if (prolongedGaze) {
    cards.push({
      id: "rec_gaze",
      reason: "Prolonged screen gaze detected without a break.",
      metric: `Focus score: ${scores.focus}`,
      action: "Take a short walk from Move & Coach or start a 90-second reset to break the doomscroll loop.",
      ctaLabel: "Check Posture",
      destination: "posture",
    });
  }

  return cards.slice(0, 3);
}
