"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  ActivityType,
  ChatMessage,
  ConnectionRequest,
  Conversation,
  ExperienceLevel,
  PlannedActivity,
  SearchCriteria,
  TimeOfDay,
} from "@/lib/connect/types";
import { MOCK_PARTNERS } from "@/lib/connect/mockPartners";
import { TrainerSessionRequest, TrainerSessionStatus } from "@/lib/move/types";

function makeId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export interface TrainerChatMessage {
  id: string;
  conversationId: string;
  sender: "me" | "trainer";
  text: string;
  timestamp: string;
}

interface WellnessProfile {
  activities: ActivityType[];
  preferredTime: TimeOfDay;
  distanceKm?: [number, number];
  paceMinPerKm?: [number, number];
  experienceLevel: ExperienceLevel;
  availability: string[];
  runsCompleted: number;
  walksCompleted: number;
  gymSessionsCompleted: number;
}

interface ConnectState {
  criteria: SearchCriteria;
  requests: ConnectionRequest[];
  connections: string[]; // accepted partner ids
  blockedIds: string[];
  conversations: Conversation[];
  messages: ChatMessage[];
  plans: PlannedActivity[];
  profile: WellnessProfile;
  trainerConnections: string[]; // trainer ids
  trainerRequests: TrainerSessionRequest[];
  trainerMessages: TrainerChatMessage[];

  requestTrainerSession: (
    trainerId: string,
    request: Omit<TrainerSessionRequest, "id" | "createdAt" | "trainerId" | "status" | "conversationId">
  ) => void;
  respondTrainerRequest: (requestId: string, status: TrainerSessionStatus) => void;
  sendTrainerMessage: (conversationId: string, text: string) => void;

  setCriteria: (patch: Partial<SearchCriteria>) => void;
  sendRequest: (partnerId: string, message?: string) => ConnectionRequest;
  acceptRequest: (requestId: string) => { conversationId: string } | null;
  declineRequest: (requestId: string) => void;
  sendMessage: (conversationId: string, text: string) => void;
  markConversationRead: (conversationId: string) => void;
  confirmAttendance: (planId: string) => void;
  cancelPlan: (planId: string) => void;
  completeActivity: (planId: string) => void;
  blockUser: (partnerId: string) => void;
  removeConnection: (partnerId: string) => void;
  leaveGroup: (planId: string) => void;
}

const DEFAULT_CRITERIA: SearchCriteria = {
  activity: "running",
  time: "morning",
  groupPreference: "partner",
  groupSize: 2,
  radiusKm: 5,
};

const DEFAULT_PROFILE: WellnessProfile = {
  activities: ["running", "gym", "walking"],
  preferredTime: "morning",
  distanceKm: [5, 7],
  paceMinPerKm: [6, 7],
  experienceLevel: "intermediate",
  availability: ["Mon", "Wed", "Fri", "Sat"],
  runsCompleted: 12,
  walksCompleted: 8,
  gymSessionsCompleted: 6,
};

export const useConnectStore = create<ConnectState>()(
  persist(
    (set, get) => ({
      criteria: DEFAULT_CRITERIA,
      requests: [],
      connections: [],
      blockedIds: [],
      conversations: [],
      messages: [],
      plans: [],
      profile: DEFAULT_PROFILE,
      trainerConnections: [],
      trainerRequests: [],
      trainerMessages: [],

      requestTrainerSession: (trainerId, request) => {
        const id = makeId("trainerreq");
        set((state) => ({
          trainerRequests: [
            {
              id,
              trainerId,
              status: "requested",
              conversationId: makeId("tconv"),
              createdAt: new Date().toISOString(),
              ...request,
            },
            ...state.trainerRequests,
          ],
        }));
        setTimeout(() => {
          const current = get().trainerRequests.find((r) => r.id === id);
          if (current && current.status === "requested") get().respondTrainerRequest(id, "confirmed");
        }, 1500);
      },

      respondTrainerRequest: (requestId, status) =>
        set((state) => ({
          trainerRequests: state.trainerRequests.map((r) => (r.id === requestId ? { ...r, status } : r)),
          trainerConnections:
            status === "confirmed"
              ? Array.from(
                  new Set([
                    ...state.trainerConnections,
                    state.trainerRequests.find((r) => r.id === requestId)?.trainerId ?? "",
                  ])
                ).filter(Boolean)
              : state.trainerConnections,
        })),

      sendTrainerMessage: (conversationId, text) => {
        set((state) => ({
          trainerMessages: [
            ...state.trainerMessages,
            { id: makeId("tmsg"), conversationId, sender: "me", text, timestamp: new Date().toISOString() },
          ],
        }));
        setTimeout(() => {
          set((state) => ({
            trainerMessages: [
              ...state.trainerMessages,
              {
                id: makeId("tmsg"),
                conversationId,
                sender: "trainer",
                text: "Sounds good — see you then. Let me know if anything changes.",
                timestamp: new Date().toISOString(),
              },
            ],
          }));
        }, 1200);
      },

      setCriteria: (patch) => set((state) => ({ criteria: { ...state.criteria, ...patch } })),

      sendRequest: (partnerId, message) => {
        const { criteria } = get();
        const request: ConnectionRequest = {
          id: makeId("req"),
          partnerId,
          activity: criteria.activity,
          time: criteria.time,
          distanceKm: criteria.distanceKm?.[1],
          groupSize: criteria.groupSize,
          message,
          status: "pending",
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ requests: [request, ...state.requests] }));

        // Demo partners auto-accept shortly after, simulating a real response.
        setTimeout(() => {
          const still = get().requests.find((r) => r.id === request.id);
          if (still && still.status === "pending") get().acceptRequest(request.id);
        }, 1500);

        return request;
      },

      acceptRequest: (requestId) => {
        const request = get().requests.find((r) => r.id === requestId);
        if (!request) return null;

        const partner = MOCK_PARTNERS.find((p) => p.id === request.partnerId);
        if (!partner) return null;

        const conversationId = makeId("conv");
        const conversation: Conversation = {
          id: conversationId,
          activity: request.activity,
          contextLabel: `${request.time}${request.distanceKm ? ` · ${request.distanceKm} km` : ""}`,
          participantIds: [partner.id],
          isGroup: request.groupSize > 2,
        };

        const plan: PlannedActivity = {
          id: makeId("plan"),
          activity: request.activity,
          scheduledLabel: formatSchedule(request.time),
          distanceKm: request.distanceKm,
          pace: partner.paceMinPerKm ? `${partner.paceMinPerKm[0]}-${partner.paceMinPerKm[1]} min/km` : undefined,
          groupSize: request.groupSize,
          participants: [
            { partnerId: "me", name: "You", confirmed: true },
            { partnerId: partner.id, name: partner.name, confirmed: true },
          ],
          conversationId,
          status: "upcoming",
        };

        set((state) => ({
          requests: state.requests.map((r) => (r.id === requestId ? { ...r, status: "accepted" } : r)),
          connections: state.connections.includes(partner.id)
            ? state.connections
            : [...state.connections, partner.id],
          conversations: [...state.conversations, conversation],
          plans: [plan, ...state.plans],
        }));

        return { conversationId };
      },

      declineRequest: (requestId) =>
        set((state) => ({
          requests: state.requests.map((r) => (r.id === requestId ? { ...r, status: "declined" } : r)),
        })),

      sendMessage: (conversationId, text) => {
        const message: ChatMessage = {
          id: makeId("msg"),
          conversationId,
          senderId: "me",
          text,
          timestamp: new Date().toISOString(),
          read: true,
        };
        set((state) => ({ messages: [...state.messages, message] }));

        const conversation = get().conversations.find((c) => c.id === conversationId);
        const partner = conversation ? MOCK_PARTNERS.find((p) => p.id === conversation.participantIds[0]) : null;
        if (partner) {
          setTimeout(() => {
            const reply: ChatMessage = {
              id: makeId("msg"),
              conversationId,
              senderId: partner.id,
              text: pickReply(),
              timestamp: new Date().toISOString(),
              read: false,
            };
            set((state) => ({ messages: [...state.messages, reply] }));
          }, 1200);
        }
      },

      markConversationRead: (conversationId) =>
        set((state) => ({
          messages: state.messages.map((m) => (m.conversationId === conversationId ? { ...m, read: true } : m)),
        })),

      confirmAttendance: (planId) =>
        set((state) => ({
          plans: state.plans.map((p) =>
            p.id === planId
              ? {
                  ...p,
                  participants: p.participants.map((participant) =>
                    participant.partnerId === "me" ? { ...participant, confirmed: true } : participant
                  ),
                }
              : p
          ),
        })),

      cancelPlan: (planId) =>
        set((state) => ({
          plans: state.plans.map((p) => (p.id === planId ? { ...p, status: "cancelled" } : p)),
        })),

      completeActivity: (planId) =>
        set((state) => ({
          plans: state.plans.map((p) => (p.id === planId ? { ...p, status: "completed" } : p)),
        })),

      blockUser: (partnerId) =>
        set((state) => ({
          blockedIds: [...state.blockedIds, partnerId],
          connections: state.connections.filter((id) => id !== partnerId),
          conversations: state.conversations.filter((c) => !c.participantIds.includes(partnerId)),
        })),

      removeConnection: (partnerId) =>
        set((state) => ({ connections: state.connections.filter((id) => id !== partnerId) })),

      leaveGroup: (planId) =>
        set((state) => ({ plans: state.plans.filter((p) => p.id !== planId) })),
    }),
    { name: "vitaos-connect-store" }
  )
);

function formatSchedule(time: TimeOfDay): string {
  const clock = { morning: "7:00 AM", afternoon: "1:00 PM", evening: "7:00 PM", flexible: "Flexible time" }[time];
  return `Tomorrow · ${clock}`;
}

function pickReply(): string {
  const replies = [
    "Sounds good, see you then!",
    "Works for me 👍",
    "Let's do it.",
    "I'll bring water, you good on route?",
    "Perfect, looking forward to it.",
  ];
  return replies[Math.floor(Math.random() * replies.length)];
}

export function partnerName(id: string): string {
  return MOCK_PARTNERS.find((p) => p.id === id)?.name ?? "Partner";
}
