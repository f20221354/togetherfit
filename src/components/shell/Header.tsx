"use client";

import { useTheme } from "next-themes";
import { useCameraStore } from "@/lib/store/cameraStore";
import { CameraPrivacyIndicator } from "@/components/camera/CameraPrivacyIndicator";
import { useIsClient } from "@/lib/useIsClient";
import { TogetherfitLogo } from "@/components/brand/TogetherfitLogo";
import { Icon } from "@/components/ui/Icon";

export function Header() {
  const monitoring = useCameraStore((s) => s.monitoring);
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useIsClient();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-border bg-surface px-4 py-2.5 md:static md:px-6 md:py-3">
      <div className="min-w-0 md:invisible">
        <TogetherfitLogo layout="inline" size={28} />
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <CameraPrivacyIndicator active={monitoring} />
        <button
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          className="rounded-full bg-surface-2 p-2 text-sm text-foreground hover:bg-border"
          aria-label="Toggle theme"
        >
          {mounted ? <Icon name={resolvedTheme === "dark" ? "time.moon" : "time.sun"} size={16} /> : <span className="block h-4 w-4" />}
        </button>
      </div>
    </header>
  );
}
