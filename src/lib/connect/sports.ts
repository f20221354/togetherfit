/**
 * Sports offered in Find a Friend. The whole flow (picker, radar, cards)
 * reads from this list, so adding a sport is one line here.
 */
export interface SportOption {
  key: string;
  label: string;
  icon: string;
}

export const SPORTS: SportOption[] = [
  { key: "running", label: "Running", icon: "🏃" },
  { key: "gym", label: "Gym", icon: "🏋️" },
  { key: "cycling", label: "Cycling", icon: "🚴" },
  { key: "yoga", label: "Yoga", icon: "🧘" },
  { key: "football", label: "Football", icon: "⚽" },
  { key: "badminton", label: "Badminton", icon: "🏸" },
  { key: "walking", label: "Walking", icon: "🚶" },
  { key: "hiking", label: "Hiking", icon: "🥾" },
];

export const SPORT_KEYS = new Set(SPORTS.map((s) => s.key));

export function sportMeta(key: string): SportOption {
  return SPORTS.find((s) => s.key === key) ?? { key, label: key, icon: "🤝" };
}
