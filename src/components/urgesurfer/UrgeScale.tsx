"use client";

export function UrgeScale({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-foreground">{label}</span>
        <span className="font-semibold text-accent-foreground">{value ?? "—"} / 10</span>
      </div>
      <input
        type="range"
        min={1}
        max={10}
        value={value ?? 5}
        onChange={(e) => onChange(Number(e.target.value))}
        className="accent-[var(--accent)]"
      />
      <div className="flex justify-between text-[10px] text-muted">
        <span>1</span>
        <span>10</span>
      </div>
      <p className="text-[11px] text-muted">Self-reported, not a medical measurement.</p>
    </div>
  );
}
