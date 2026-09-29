import { useId } from "react";
import art from "./logoArt.json";
import { BrandPalette } from "./palette";

/**
 * The emblem's shapes (petals, line icons, S-shaped figure) drawn into an
 * existing <svg> on the 200-unit grid from logoArt.json. The gap around the
 * figure is a mask, so it stays transparent on any background.
 */
export function Emblem({
  palette,
  glyphs = true,
  rays = true,
  gap = 7,
}: {
  palette: BrandPalette;
  /** Line icons inside the petals — dropped at small sizes where they'd blur. */
  glyphs?: boolean;
  rays?: boolean;
  /** Width of the negative space around the figure, in grid units. */
  gap?: number;
}) {
  const id = useId().replace(/:/g, "");
  const { petals, icons, figure, head } = art;

  return (
    <g>
      <defs>
        <linearGradient id={`sb-sleep-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={palette.sleepFrom} />
          <stop offset="1" stopColor={palette.sleepTo} />
        </linearGradient>
        <mask id={`sb-gap-${id}`} maskUnits="userSpaceOnUse" x="-40" y="-40" width="280" height="280">
          <rect x="-40" y="-40" width="280" height="280" fill="#fff" />
          <g fill="#000" stroke="#000" strokeWidth={gap * 2} strokeLinejoin="round">
            <path d={figure} />
            <circle cx={head.cx} cy={head.cy} r={head.r} />
          </g>
        </mask>
      </defs>

      {rays && <path d={art.rays} stroke={palette.accent} strokeWidth={4} strokeLinecap="round" fill="none" />}

      <g mask={`url(#sb-gap-${id})`}>
        <path d={petals.sleep} fill={`url(#sb-sleep-${id})`} />
        <path d={petals.posture} fill={palette.posture} />
        <path d={petals.mind} fill={palette.mind} />
        <path d={petals.movement} fill={palette.movement} />
        <path d={petals.digital} fill={palette.digital} />
        {glyphs && (
          <g fill="none" stroke={palette.glyph} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
            <path d={icons.sleep} />
            <path d={icons.posture} />
            <path d={icons.mind} />
            <path d={icons.movement} />
            <path d={icons.digital} />
          </g>
        )}
      </g>

      <g fill={palette.figure}>
        <path d={figure} />
        <circle cx={head.cx} cy={head.cy} r={head.r} />
      </g>
    </g>
  );
}
