"use client";

import { useState } from "react";
import clsx from "clsx";

const SIZES = { xs: "h-6 w-6 text-[10px]", sm: "h-8 w-8 text-xs", md: "h-10 w-10 text-sm", lg: "h-20 w-20 text-2xl", xl: "h-28 w-28 text-4xl" } as const;

/**
 * A person's photo when you're allowed to see it, otherwise their initial,
 * plus the ✓ badge when they're verified. If the photo can't be loaded (e.g.
 * their search ended and you're no longer allowed to see it), it falls back
 * to the initial.
 */
export function Avatar({
  name,
  photoId,
  verified = false,
  size = "md",
  large = false,
}: {
  name: string;
  photoId?: string | null;
  verified?: boolean;
  size?: keyof typeof SIZES;
  /** Load the 512px version (profile page) instead of 128px. */
  large?: boolean;
}) {
  const [failedId, setFailedId] = useState<string | null>(null);
  const showPhoto = !!photoId && failedId !== photoId;
  return (
    <span className={clsx("relative inline-flex shrink-0", SIZES[size])}>
      {showPhoto ? (
        // Served by our permission-checked API route, not a static asset, so next/image adds nothing here.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/photos/${photoId}${large ? "?size=large" : ""}`}
          alt={name}
          onError={() => setFailedId(photoId)}
          className="h-full w-full rounded-full object-cover"
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center rounded-full bg-accent/15 font-bold text-accent-foreground" aria-hidden="true">
          {name.charAt(0).toUpperCase() || "?"}
        </span>
      )}
      {verified && (
        <span
          title="Verified"
          aria-label="Verified"
          className="absolute -bottom-0.5 -right-0.5 flex h-[38%] min-h-3.5 w-[38%] min-w-3.5 items-center justify-center rounded-full border-2 border-surface bg-sky-500 text-[0.6em] font-bold text-white"
        >
          ✓
        </span>
      )}
    </span>
  );
}
