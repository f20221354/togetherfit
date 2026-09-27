"use client";

import Link from "next/link";
import clsx from "clsx";
import { ProgressBar } from "@/components/ui/ProgressBar";

export function ModuleStatusCard({
  icon,
  title,
  metricLabel,
  metricValue,
  detail,
  href,
  progress,
}: {
  icon: string;
  title: string;
  metricLabel: string;
  metricValue: string | number;
  detail: string;
  href: string;
  progress?: number;
}) {
  return (
    <Link
      href={href}
      className={clsx(
        "group flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4",
        "transition-colors hover:border-emerald-400/30 hover:bg-white/[0.05]"
      )}
    >
      <div className="flex items-center gap-2 text-sm font-medium text-white/80">
        <span className="text-lg">{icon}</span>
        {title}
      </div>
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-white/40">{metricLabel}</span>
        <span className="text-xl font-semibold tabular-nums">{metricValue}</span>
      </div>
      {typeof progress === "number" && <ProgressBar value={progress} />}
      <div className="text-xs text-white/40">{detail}</div>
      <span className="mt-1 text-xs font-medium text-emerald-300 group-hover:translate-x-0.5 transition-transform">
        Open →
      </span>
    </Link>
  );
}
