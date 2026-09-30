"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { NUDGE_CONFIG, NudgeKind, NudgeState } from "@/lib/camera/postureNudges";

export type CameraPermissionState =
  | "unknown"
  | "granted"
  | "denied"
  | "unavailable"
  | "insecure-context";

export type PostureStatus = "optimal" | "mild" | "elevated-risk";

/** The nudge currently on screen; posture + gaze close together merge into "both". */
export interface ActiveNudge {
  id: number;
  kind: NudgeKind | "both";
  at: number;
}

interface CameraState {
  permission: CameraPermissionState;
  monitoring: boolean;
  monitoringStartedAt: number | null;

  eyeLevelAngle: number | null;
  headTilt: number | null;
  headTurn: number | null;
  postureStatus: PostureStatus | null;
  slouchEventsToday: number;

  postureNudgeState: NudgeState;
  gazeNudgeState: NudgeState;
  activeNudge: ActiveNudge | null;
  /** Opt-in: also show a system notification when the app window isn't focused. */
  systemNotifications: boolean;

  demoSliderMode: boolean;
  demoPostureValue: number; // 0 = optimal, 100 = slouch
  demoEyeLevelValue: number; // 0 = high (good), 100 = low (bad)

  alertsEnabled: boolean;
  gazeAlertsEnabled: boolean;
  alertSensitivity: "low" | "medium" | "high";
  alertCooldownMinutes: number;
  lastAlertAt: number | null;

  setPermission: (p: CameraPermissionState) => void;
  setMonitoring: (on: boolean) => void;
  updateMetrics: (m: Partial<Pick<CameraState, "eyeLevelAngle" | "headTilt" | "headTurn" | "postureStatus">>) => void;
  setNudgeStates: (posture: NudgeState, gaze: NudgeState) => void;
  pushNudge: (kind: NudgeKind) => ActiveNudge;
  dismissNudge: () => void;
  setSystemNotifications: (on: boolean) => void;
  registerSlouchEvent: () => void;
  setDemoSliderMode: (on: boolean) => void;
  setDemoPostureValue: (v: number) => void;
  setDemoEyeLevelValue: (v: number) => void;
  setAlertsEnabled: (on: boolean) => void;
  setGazeAlertsEnabled: (on: boolean) => void;
  setAlertSensitivity: (s: CameraState["alertSensitivity"]) => void;
  setAlertCooldownMinutes: (m: number) => void;
  markAlertFired: () => void;
  canFireAlert: () => boolean;
}

export const useCameraStore = create<CameraState>()(
  persist(
    (set, get) => ({
      permission: "unknown",
      monitoring: false,
      monitoringStartedAt: null,

      eyeLevelAngle: null,
      headTilt: null,
      headTurn: null,
      postureStatus: null,
      slouchEventsToday: 0,

      postureNudgeState: "no-detection",
      gazeNudgeState: "no-detection",
      activeNudge: null,
      systemNotifications: false,

      demoSliderMode: false,
      demoPostureValue: 15,
      demoEyeLevelValue: 20,

      alertsEnabled: true,
      gazeAlertsEnabled: true,
      alertSensitivity: "medium",
      alertCooldownMinutes: 1, // "Remind again every" — also spaces separate episodes
      lastAlertAt: null,

      setPermission: (permission) => set({ permission }),
      setMonitoring: (monitoring) =>
        set({
          monitoring,
          monitoringStartedAt: monitoring ? Date.now() : null,
        }),
      updateMetrics: (m) => set(m),
      setNudgeStates: (postureNudgeState, gazeNudgeState) => {
        const s = get();
        if (s.postureNudgeState !== postureNudgeState || s.gazeNudgeState !== gazeNudgeState) {
          set({ postureNudgeState, gazeNudgeState });
        }
      },
      pushNudge: (kind) => {
        const now = Date.now();
        const current = get().activeNudge;
        const merge = current !== null && current.kind !== kind && now - current.at < NUDGE_CONFIG.NUDGE_VISIBLE_MS;
        const next: ActiveNudge = { id: (current?.id ?? 0) + 1, kind: merge ? "both" : kind, at: now };
        set({ activeNudge: next });
        return next;
      },
      dismissNudge: () => set({ activeNudge: null }),
      setSystemNotifications: (systemNotifications) => set({ systemNotifications }),
      registerSlouchEvent: () =>
        set((state) => ({ slouchEventsToday: state.slouchEventsToday + 1 })),
      setDemoSliderMode: (demoSliderMode) => set({ demoSliderMode }),
      setDemoPostureValue: (demoPostureValue) => set({ demoPostureValue }),
      setDemoEyeLevelValue: (demoEyeLevelValue) => set({ demoEyeLevelValue }),
      setAlertsEnabled: (alertsEnabled) => set({ alertsEnabled }),
      setGazeAlertsEnabled: (gazeAlertsEnabled) => set({ gazeAlertsEnabled }),
      setAlertSensitivity: (alertSensitivity) => set({ alertSensitivity }),
      setAlertCooldownMinutes: (alertCooldownMinutes) => set({ alertCooldownMinutes }),
      markAlertFired: () => set({ lastAlertAt: Date.now() }),
      canFireAlert: () => {
        const { lastAlertAt, alertCooldownMinutes } = get();
        if (!lastAlertAt) return true;
        return Date.now() - lastAlertAt >= alertCooldownMinutes * 60_000;
      },
    }),
    {
      name: "vitaos-camera-store",
      version: 1,
      // v0 used a 3-minute one-off cooldown; reminders now repeat, so move the old default to 1 minute.
      migrate: (persisted, version) => {
        const state = persisted as Partial<CameraState>;
        if (version < 1 && state.alertCooldownMinutes === 3) state.alertCooldownMinutes = 1;
        return state as CameraState;
      },
      partialize: (state) => ({
        alertsEnabled: state.alertsEnabled,
        gazeAlertsEnabled: state.gazeAlertsEnabled,
        alertSensitivity: state.alertSensitivity,
        alertCooldownMinutes: state.alertCooldownMinutes,
        systemNotifications: state.systemNotifications,
        demoPostureValue: state.demoPostureValue,
        demoEyeLevelValue: state.demoEyeLevelValue,
      }),
    }
  )
);
