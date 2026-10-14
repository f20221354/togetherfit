import { isIconName, type IconName } from "@/components/ui/Icon";
import type { Goal } from "./types";

const BY_TYPE: Record<string, IconName> = {
  distance: "sport.running",
  duration: "sport.walking",
  frequency: "sport.gym",
  strength: "sport.gym",
  consistency: "status.energy",
  mobility: "sport.yoga",
};

/** A goal's icon. Goals saved before the icon system stored an emoji, so fall back to one by goal type. */
export function goalIcon(goal: Pick<Goal, "icon" | "type">): IconName {
  return isIconName(goal.icon) ? goal.icon : (BY_TYPE[goal.type] ?? "object.goal");
}
