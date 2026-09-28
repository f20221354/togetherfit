"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";

export function CameraPrivacyIndicator({ active }: { active: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={clsx(
          "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
          active ? "bg-danger/15 text-danger" : "bg-surface-2 text-muted"
        )}
      >
        <span className={clsx("h-1.5 w-1.5 rounded-full", active ? "bg-danger animate-pulse" : "bg-muted")} />
        {active ? "CAMERA MONITORING ACTIVE" : "CAMERA OFF"}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-border bg-surface p-3 text-xs text-muted shadow-lg">
          {active ? (
            <>
              स्वस्थ Bharat is analyzing your camera feed locally in your browser. No video is being
              recorded or uploaded.
            </>
          ) : (
            <>Camera monitoring is off. Turn it on from the Posture &amp; Gaze Guard module.</>
          )}
        </div>
      )}
    </div>
  );
}
