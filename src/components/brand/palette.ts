/**
 * Swasth Bharat brand colours, one palette per theme. Dark mode is a
 * deliberate treatment (white figure and wordmark, brighter greens and
 * orange), never a CSS filter over the light logo.
 */
export interface BrandPalette {
  figure: string;
  wordmark: string;
  posture: string;
  sleepFrom: string;
  sleepTo: string;
  mind: string;
  movement: string;
  digital: string;
  /** Rays and leaf accents. */
  accent: string;
  glyph: string;
  swooshFrom: string;
  swooshTo: string;
  /** App-icon tile background. */
  tile: string;
}

export const LIGHT_PALETTE: BrandPalette = {
  figure: "#087443",
  wordmark: "#087443",
  posture: "#43A047",
  sleepFrom: "#FFB347",
  sleepTo: "#FF8A00",
  mind: "#FF6B57",
  movement: "#4DA3FF",
  digital: "#9B7BFF",
  accent: "#43A047",
  glyph: "#FFFFFF",
  swooshFrom: "#FF8A00",
  swooshTo: "#43A047",
  tile: "#FFFFFF",
};

export const DARK_PALETTE: BrandPalette = {
  figure: "#F7FFF9",
  wordmark: "#F7FFF9",
  posture: "#4CAF50",
  sleepFrom: "#FFB347",
  sleepTo: "#FF9418",
  mind: "#FF6B57",
  movement: "#4DA3FF",
  digital: "#9B7BFF",
  accent: "#4CAF50",
  glyph: "#FFFFFF",
  swooshFrom: "#FF9418",
  swooshTo: "#4CAF50",
  tile: "#071A16",
};
