import { useId } from "react";
import clsx from "clsx";
import { Emblem } from "./Emblem";
import { SwasthBharatIconDark, SwasthBharatIconLight } from "./SwasthBharatIcon";
import { BrandPalette, DARK_PALETTE, LIGHT_PALETTE } from "./palette";

type Layout = "stacked" | "inline";

interface LogoProps {
  /**
   * stacked — the full mark from the reference: emblem, स्वस्थ, Bharat, swoosh.
   * inline  — compact emblem beside the two-line wordmark, for nav bars.
   */
  layout?: Layout;
  /** stacked: rendered width in px. inline: emblem height in px. */
  size?: number;
  className?: string;
}

const BRAND_FONT = "var(--font-brand), system-ui, sans-serif";

/** Two leaves beside the wordmark, as in the reference. */
const LEAVES = "M0 0C3-9 12-14 22-13C19-4 10 2 0 0Z M4 10C12 6 21 8 26 14C18 18 9 17 4 10Z";

function StackedSvg({ palette, size = 220, className }: { palette: BrandPalette; size?: number; className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg width={size} height={(size * 372) / 260} viewBox="-30 -10 260 372" role="img" aria-label="स्वस्थ Bharat" className={className}>
      <defs>
        <linearGradient id={`sb-swoosh-${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={palette.swooshFrom} />
          <stop offset="1" stopColor={palette.swooshTo} />
        </linearGradient>
      </defs>
      <Emblem palette={palette} />
      <g fill={palette.wordmark} textAnchor="middle" style={{ fontFamily: BRAND_FONT, fontWeight: 800 }}>
        <text x="100" y="264" fontSize="80">
          स्वस्थ
        </text>
        <text x="100" y="330" fontSize="72" letterSpacing="1">
          Bharat
        </text>
      </g>
      <path d={LEAVES} transform="translate(190 196) rotate(-18)" fill={palette.accent} />
      <path d="M22 352C80 338 150 336 204 344" stroke={`url(#sb-swoosh-${id})`} strokeWidth="7" strokeLinecap="round" fill="none" />
    </svg>
  );
}

function InlineLockup({ dark, size = 36, className }: { dark: boolean; size?: number; className?: string }) {
  const palette = dark ? DARK_PALETTE : LIGHT_PALETTE;
  const Icon = dark ? SwasthBharatIconDark : SwasthBharatIconLight;
  return (
    <span role="img" aria-label="स्वस्थ Bharat" className={clsx("inline-flex items-center gap-2", className)}>
      <Icon size={size} title="" />
      <span aria-hidden className="flex flex-col leading-none" style={{ fontFamily: BRAND_FONT, fontWeight: 800, color: palette.wordmark }}>
        <span style={{ fontSize: size * 0.56 }}>स्वस्थ</span>
        <span style={{ fontSize: size * 0.44, marginTop: size * 0.02 }}>Bharat</span>
      </span>
    </span>
  );
}

/** The logo's light-mode treatment: green figure and wordmark, orange energy. */
export function SwasthBharatLogoLight({ layout = "stacked", size, className }: LogoProps) {
  return layout === "inline" ? (
    <InlineLockup dark={false} size={size} className={className} />
  ) : (
    <StackedSvg palette={LIGHT_PALETTE} size={size} className={className} />
  );
}

/** The logo's dark-mode treatment: white figure and wordmark, bright green and orange. */
export function SwasthBharatLogoDark({ layout = "stacked", size, className }: LogoProps) {
  return layout === "inline" ? (
    <InlineLockup dark size={size} className={className} />
  ) : (
    <StackedSvg palette={DARK_PALETTE} size={size} className={className} />
  );
}

/** Theme-aware logo: shows the treatment that matches the current app theme. */
export function SwasthBharatLogo({ className, ...props }: LogoProps) {
  return (
    <>
      <SwasthBharatLogoLight {...props} className={clsx("sb-only-light", className)} />
      <SwasthBharatLogoDark {...props} className={clsx("sb-only-dark", className)} />
    </>
  );
}
