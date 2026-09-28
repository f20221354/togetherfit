"use client";

import { useState } from "react";
import clsx from "clsx";
import Link from "next/link";
import { ModuleKey } from "@/lib/types";
import { MODULE_ROUTES } from "@/lib/store/wellnessStore";

const NODES: { key: ModuleKey; label: string; x: number; y: number; icon: string }[] = [
  { key: "circadian", label: "Circadian Arc", x: 50, y: 8, icon: "☀️" },
  { key: "posture", label: "Posture & Gaze", x: 12, y: 45, icon: "👁" },
  { key: "move", label: "Move & Coach", x: 88, y: 45, icon: "🏃" },
  { key: "urgesurfer", label: "UrgeSurfer", x: 50, y: 62, icon: "🫁" },
  { key: "sanctuary", label: "Sanctuary", x: 50, y: 92, icon: "🌿" },
];

const CORE = { x: 50, y: 45 };

const CONNECTIONS: [ModuleKey, ModuleKey][] = [
  ["circadian", "posture"],
  ["circadian", "move"],
  ["posture", "urgesurfer"],
  ["move", "urgesurfer"],
  ["urgesurfer", "sanctuary"],
];

export function EcosystemMap() {
  const [active, setActive] = useState<ModuleKey | null>(null);

  const nodeByKey = Object.fromEntries(NODES.map((n) => [n.key, n]));

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <h3 className="mb-4 text-sm font-semibold text-foreground">Wellness Ecosystem</h3>
      <div className="relative h-80 w-full">
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {NODES.map((n) => (
            <line
              key={`core-${n.key}`}
              x1={CORE.x}
              y1={CORE.y}
              x2={n.x}
              y2={n.y}
              stroke={active === n.key ? "var(--accent)" : "var(--border)"}
              strokeWidth={active === n.key ? 0.6 : 0.3}
            />
          ))}
          {CONNECTIONS.map(([a, b]) => {
            const na = nodeByKey[a];
            const nb = nodeByKey[b];
            const highlighted = active === a || active === b;
            return (
              <line
                key={`${a}-${b}`}
                x1={na.x}
                y1={na.y}
                x2={nb.x}
                y2={nb.y}
                stroke={highlighted ? "var(--accent)" : "var(--border)"}
                strokeWidth={highlighted ? 0.5 : 0.25}
                strokeDasharray="1.5 1.5"
              />
            );
          })}
        </svg>

        <div
          className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 rounded-full bg-accent/15 px-3 py-3 text-center text-xs font-semibold text-accent-foreground"
          style={{ left: `${CORE.x}%`, top: `${CORE.y}%` }}
        >
          <span>◈</span>
          VitaOS Core
        </div>

        {NODES.map((n) => (
          <Link
            key={n.key}
            href={MODULE_ROUTES[n.key]}
            onMouseEnter={() => setActive(n.key)}
            onMouseLeave={() => setActive(null)}
            className={clsx(
              "absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 rounded-xl border px-3 py-2 text-center text-xs font-medium transition-colors",
              active === n.key
                ? "border-accent/50 bg-accent/10 text-accent-foreground"
                : "border-border bg-surface text-muted"
            )}
            style={{ left: `${n.x}%`, top: `${n.y}%` }}
          >
            <span className="text-base">{n.icon}</span>
            {n.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
