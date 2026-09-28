export type ActivityType =
  | "running"
  | "walking"
  | "gym"
  | "cycling"
  | "yoga"
  | "sports"
  | "hiking"
  | "sunlightWalk";

export type TimeOfDay = "morning" | "afternoon" | "evening" | "flexible";

export type GroupPreference = "partner" | "group";

export type ExperienceLevel = "beginner" | "intermediate" | "advanced";

export const ACTIVITY_META: Record<ActivityType, { label: string; icon: string }> = {
  running: { label: "Running", icon: "🏃" },
  walking: { label: "Walking", icon: "🚶" },
  gym: { label: "Gym", icon: "🏋️" },
  cycling: { label: "Cycling", icon: "🚴" },
  yoga: { label: "Yoga", icon: "🧘" },
  sports: { label: "Sports", icon: "🏀" },
  hiking: { label: "Hiking", icon: "🥾" },
  sunlightWalk: { label: "Sunlight Walk", icon: "☀️" },
};

export interface SearchCriteria {
  activity: ActivityType;
  time: TimeOfDay;
  groupPreference: GroupPreference;
  groupSize: 2 | 3;
  distanceKm?: [number, number];
  paceMinPerKm?: [number, number];
  experienceLevel?: ExperienceLevel;
  radiusKm: number;
}

export interface PartnerProfile {
  id: string;
  name: string;
  age: number;
  activities: ActivityType[];
  distanceKm?: [number, number];
  paceMinPerKm?: [number, number];
  workoutType?: string;
  experienceLevel: ExperienceLevel;
  preferredTime: TimeOfDay;
  availability: string[]; // days: Mon, Tue, ...
  approxDistanceAway: string; // "~2.1 km away"
  avatar: string; // emoji placeholder, never a real photo
  isDemo: true;
}

export interface CompatibilityResult {
  score: number;
  reasons: string[];
}

export type ConnectionRequestStatus = "pending" | "accepted" | "declined";

export interface ConnectionRequest {
  id: string;
  partnerId: string;
  activity: ActivityType;
  time: TimeOfDay;
  distanceKm?: number;
  groupSize: number;
  message?: string;
  status: ConnectionRequestStatus;
  createdAt: string;
}

export interface ActivityParticipant {
  partnerId: string; // "me" for the current user
  name: string;
  confirmed: boolean;
}

export interface PlannedActivity {
  id: string;
  activity: ActivityType;
  scheduledLabel: string; // "Tomorrow · 7:00 AM"
  distanceKm?: number;
  pace?: string;
  groupSize: number;
  participants: ActivityParticipant[];
  conversationId: string;
  status: "upcoming" | "completed" | "cancelled";
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string; // "me" or partnerId
  text: string;
  timestamp: string;
  read: boolean;
}

export interface Conversation {
  id: string;
  activity: ActivityType;
  contextLabel: string;
  participantIds: string[]; // partner ids, excludes "me"
  isGroup: boolean;
}
