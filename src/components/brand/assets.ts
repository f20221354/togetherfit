/**
 * togetherfit brand images in /public/brand, cut from the approved logo
 * (light and dark treatments are separate artwork, never a CSS filter).
 * Sizes are the files' pixel dimensions, used to keep the aspect ratio.
 */
export const BRAND_IMAGES = {
  logo: {
    light: { src: "/brand/togetherfit-logo-light.png", width: 520, height: 506 },
    dark: { src: "/brand/togetherfit-logo-dark.png", width: 446, height: 413 },
  },
  mark: {
    light: { src: "/brand/togetherfit-mark-light.png", width: 256, height: 223 },
    dark: { src: "/brand/togetherfit-mark-dark.png", width: 256, height: 210 },
  },
} as const;

/** Wordmark colours sampled from the logo: navy "together" (white in dark mode), green "fit". */
export const WORDMARK = {
  light: { together: "#0A1D38", fit: "#2CB144" },
  dark: { together: "#F8FCFC", fit: "#2CB144" },
} as const;

export type BrandVariant = "light" | "dark";
