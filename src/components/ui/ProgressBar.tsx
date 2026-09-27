import clsx from "clsx";

export function ProgressBar({
  value,
  tone = "default",
  className,
}: {
  value: number;
  tone?: "default" | "good" | "warning" | "critical";
  className?: string;
}) {
  const toneClass = {
    default: "bg-emerald-400",
    good: "bg-emerald-400",
    warning: "bg-amber-400",
    critical: "bg-rose-400",
  }[tone];

  return (
    <div className={clsx("h-2 w-full rounded-full bg-white/10", className)}>
      <div
        className={clsx("h-2 rounded-full transition-all duration-500", toneClass)}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}
