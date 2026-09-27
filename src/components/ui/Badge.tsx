import clsx from "clsx";

export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "positive" | "warning" | "live" | "demo";
}) {
  const toneClass = {
    neutral: "bg-white/10 text-white/70",
    positive: "bg-emerald-400/15 text-emerald-300",
    warning: "bg-amber-400/15 text-amber-300",
    live: "bg-emerald-400/15 text-emerald-300",
    demo: "bg-violet-400/15 text-violet-300",
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
