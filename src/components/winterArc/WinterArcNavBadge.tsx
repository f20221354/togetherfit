"use client";

import Link from "next/link";
import { useIsClient } from "@/lib/useIsClient";
import { WINTER_ARC_COPY, WINTER_ARC_PAGE_PATH, isWinterArcActive } from "@/lib/winterArc/config";

/**
 * "❄️ Limited Time" pill for the Move & Coach nav item. Renders only while
 * the event is live (date check lives in winterArc/config), and only on the
 * client so server and browser clocks can't disagree during hydration.
 * Render it as a sibling of the nav link — it's a link itself.
 */
export function WinterArcNavBadge({ onNavigate, className }: { onNavigate?: () => void; className?: string }) {
  const isClient = useIsClient();
  if (!isClient || !isWinterArcActive()) return null;
  return (
    <Link
      href={WINTER_ARC_PAGE_PATH}
      onClick={onNavigate}
      aria-label={`${WINTER_ARC_COPY.title}: ${WINTER_ARC_COPY.navBadge.toLowerCase()} event`}
      className={
        "inline-flex shrink-0 items-center gap-1 rounded-full bg-winter/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-winter hover:bg-winter/25 " +
        (className ?? "")
      }
    >
      <span aria-hidden="true">❄️</span>
      {WINTER_ARC_COPY.navBadge}
    </Link>
  );
}
