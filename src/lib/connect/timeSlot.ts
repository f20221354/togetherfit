export function timeSlotLabel(mode: "now" | "scheduled", startTime: string): string {
  if (mode === "now") return "Now";
  return formatWhen(startTime);
}

export function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString([], { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}
