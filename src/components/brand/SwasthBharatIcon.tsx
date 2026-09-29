import clsx from "clsx";
import { Emblem } from "./Emblem";
import { BrandPalette, DARK_PALETTE, LIGHT_PALETTE } from "./palette";

interface IconProps {
  /** Rendered size in px (square). */
  size?: number;
  /** Draw the rounded app-icon tile behind the emblem (white in light, #071A16 in dark). */
  tile?: boolean;
  className?: string;
  title?: string;
}

/** Below this size the petal line icons would blur, so only the silhouette is drawn. */
const DETAIL_MIN_PX = 72;
/** App-icon tile; small sizes use less padding so the silhouette stays legible. */
const TILE = "-24 -30 248 248";
const TILE_SMALL = "-10 -16 220 220";

function IconSvg({ palette, size = 32, tile = false, className, title = "स्वस्थ Bharat" }: IconProps & { palette: BrandPalette }) {
  const small = size < DETAIL_MIN_PX;
  return (
    <svg
      width={size}
      height={size}
      viewBox={tile ? (small ? TILE_SMALL : TILE) : "0 -8 200 200"}
      {...(title ? { role: "img", "aria-label": title } : { "aria-hidden": true })}
      className={clsx("shrink-0", className)}
    >
      {tile && <rect x={small ? -10 : -24} y={small ? -16 : -30} width={small ? 220 : 248} height={small ? 220 : 248} rx={small ? 48 : 56} fill={palette.tile} />}
      <Emblem palette={palette} glyphs={!small} rays={false} gap={small ? 10 : 7} />
    </svg>
  );
}

/** Emblem only (no wordmark) — green figure on light surfaces. */
export function SwasthBharatIconLight(props: IconProps) {
  return <IconSvg palette={LIGHT_PALETTE} {...props} />;
}

/** Emblem only — white figure, brighter accents for dark surfaces. */
export function SwasthBharatIconDark(props: IconProps) {
  return <IconSvg palette={DARK_PALETTE} {...props} />;
}

/**
 * Picks the light or dark treatment from the app theme (data-theme on
 * <html>, set by next-themes before paint), so there's no flash of the wrong one.
 */
export function SwasthBharatIcon({ className, ...props }: IconProps) {
  return (
    <>
      <SwasthBharatIconLight {...props} className={clsx("sb-only-light", className)} />
      <SwasthBharatIconDark {...props} className={clsx("sb-only-dark", className)} />
    </>
  );
}
