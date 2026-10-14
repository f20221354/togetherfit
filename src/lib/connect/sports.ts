/**
 * Sports offered in Find a Friend. The whole flow (picker, radar, cards)
 * reads from this list, so adding a sport is one line here.
 */
import type { IconName } from "@/components/ui/Icon";

export interface SportOption {
  key: string;
  label: string;
  icon: IconName;
}

export const SPORTS: SportOption[] = [
  { key: "running", label: "Running", icon: "sport.running" },
  { key: "gym", label: "Gym", icon: "sport.gym" },
  { key: "cycling", label: "Cycling", icon: "sport.cycling" },
  { key: "yoga", label: "Yoga", icon: "sport.yoga" },
  { key: "football", label: "Football", icon: "sport.football" },
  { key: "badminton", label: "Badminton", icon: "sport.badminton" },
  { key: "walking", label: "Walking", icon: "sport.walking" },
  { key: "hiking", label: "Hiking", icon: "sport.hiking" },
];

export const SPORT_KEYS = new Set(SPORTS.map((s) => s.key));

export function sportMeta(key: string): SportOption {
  return SPORTS.find((s) => s.key === key) ?? { key, label: key, icon: "sport.other" };
}
