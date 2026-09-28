import Link from "next/link";
import { PageHeader } from "@/components/shell/PageHeader";
import { PERSONAL_NAV_ITEMS } from "@/components/shell/navItems";

const DESCRIPTIONS: Record<string, string> = {
  sanctuary: "Your environment, plus light, sleep, and daily rhythm.",
  posture: "Camera-based posture and gaze monitoring.",
  urgesurfer: "Fast recovery, breathing, and grounding resets.",
};

export default function PersonalPage() {
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <PageHeader icon="👤" title="Personal" subtitle="Your wellness and self-monitoring modules." />
      <div className="flex flex-col gap-3">
        {PERSONAL_NAV_ITEMS.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 hover:bg-surface-2"
          >
            <span className="text-2xl">{item.icon}</span>
            <div>
              <div className="text-sm font-medium text-foreground">{item.label}</div>
              <div className="text-xs text-muted">{DESCRIPTIONS[item.key]}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
