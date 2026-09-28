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
    default: "bg-success",
    good: "bg-success",
    warning: "bg-warning",
    critical: "bg-danger",
  }[tone];

  return (
    <div className={clsx("h-2 w-full rounded-full bg-surface-2", className)}>
      <div
        className={clsx("h-2 rounded-full transition-all duration-500", toneClass)}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}
