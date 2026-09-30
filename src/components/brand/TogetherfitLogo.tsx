import Image from "next/image";
import clsx from "clsx";
import { BRAND_IMAGES, BrandVariant, WORDMARK } from "./assets";
import { TogetherfitIconDark, TogetherfitIconLight } from "./TogetherfitIcon";

type Layout = "stacked" | "inline";

interface LogoProps {
  /**
   * stacked — the full approved logo: emblem above the togetherfit wordmark.
   * inline  — compact emblem beside the wordmark, for nav bars.
   */
  layout?: Layout;
  /** stacked: rendered width in px. inline: emblem height in px. */
  size?: number;
  className?: string;
}

const BRAND_FONT = "var(--font-brand), system-ui, sans-serif";

function Stacked({ variant, size = 200, className }: { variant: BrandVariant; size?: number; className?: string }) {
  const img = BRAND_IMAGES.logo[variant];
  return (
    <Image
      src={img.src}
      width={size}
      height={Math.round((size * img.height) / img.width)}
      alt="togetherfit logo"
      loading="eager"
      className={className}
    />
  );
}

function Inline({ variant, size = 36, className }: { variant: BrandVariant; size?: number; className?: string }) {
  const Icon = variant === "dark" ? TogetherfitIconDark : TogetherfitIconLight;
  const colors = WORDMARK[variant];
  return (
    <span role="img" aria-label="togetherfit" className={clsx("inline-flex items-center gap-2", className)}>
      <Icon size={size} title="" />
      <span aria-hidden className="leading-none" style={{ fontFamily: BRAND_FONT, fontWeight: 800, fontSize: size * 0.56 }}>
        <span style={{ color: colors.together }}>together</span>
        <span style={{ color: colors.fit }}>fit</span>
      </span>
    </span>
  );
}

/** Light-surface treatment: navy "together", green "fit". */
export function TogetherfitLogoLight({ layout = "stacked", ...props }: LogoProps) {
  return layout === "inline" ? <Inline variant="light" {...props} /> : <Stacked variant="light" {...props} />;
}

/** Dark-surface treatment: white "together", green "fit". */
export function TogetherfitLogoDark({ layout = "stacked", ...props }: LogoProps) {
  return layout === "inline" ? <Inline variant="dark" {...props} /> : <Stacked variant="dark" {...props} />;
}

/** Theme-aware logo: shows the treatment that matches the current app theme. */
export function TogetherfitLogo({ className, ...props }: LogoProps) {
  return (
    <>
      <TogetherfitLogoLight {...props} className={clsx("brand-only-light", className)} />
      <TogetherfitLogoDark {...props} className={clsx("brand-only-dark", className)} />
    </>
  );
}
