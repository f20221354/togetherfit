import clsx from "clsx";

export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "positive" | "warning" | "live" | "demo";
}) {
  const toneClass = {
    neutral: "bg-surface-2 text-muted",
    positive: "bg-success/15 text-success",
    warning: "bg-warning/15 text-warning",
    live: "bg-success/15 text-success",
    demo: "bg-accent/15 text-accent-foreground",
  }[tone];

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        toneClass
      )}
    >
      {children}
    </span>
  );
}
