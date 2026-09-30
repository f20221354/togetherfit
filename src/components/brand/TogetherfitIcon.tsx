import Image from "next/image";
import clsx from "clsx";
import { BRAND_IMAGES, BrandVariant } from "./assets";

interface IconProps {
  /** Rendered size in px (square box; the mark keeps its aspect ratio inside it). */
  size?: number;
  className?: string;
  /** Accessible name; pass "" when the icon sits next to visible brand text. */
  title?: string;
}

function Mark({ variant, size = 32, className, title = "togetherfit logo" }: IconProps & { variant: BrandVariant }) {
  const img = BRAND_IMAGES.mark[variant];
  const scale = Math.min(size / img.width, size / img.height);
  return (
    <span className={clsx("inline-flex shrink-0 items-center justify-center", className)} style={{ width: size, height: size }}>
      <Image
        src={img.src}
        width={Math.round(img.width * scale)}
        height={Math.round(img.height * scale)}
        alt={title}
        aria-hidden={title ? undefined : true}
        loading="eager"
      />
    </span>
  );
}

/** Emblem only (no wordmark), light-surface artwork. */
export function TogetherfitIconLight(props: IconProps) {
  return <Mark variant="light" {...props} />;
}

/** Emblem only, dark-surface artwork. */
export function TogetherfitIconDark(props: IconProps) {
  return <Mark variant="dark" {...props} />;
}

/**
 * Picks the light or dark artwork from the app theme (data-theme on <html>,
 * set by next-themes before paint), so there's no flash of the wrong one.
 */
export function TogetherfitIcon({ className, ...props }: IconProps) {
  return (
    <>
      <TogetherfitIconLight {...props} className={clsx("brand-only-light", className)} />
      <TogetherfitIconDark {...props} className={clsx("brand-only-dark", className)} />
    </>
  );
}
