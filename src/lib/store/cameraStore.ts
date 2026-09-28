"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CameraPermissionState =
  | "unknown"
  | "granted"
  | "denied"
  | "unavailable"
  | "insecure-context";

export type PostureStatus = "optimal" | "mild" | "elevated-risk";

interface CameraState {
  permission: CameraPermissionState;
  monitoring: boolean;
  monitoringStartedAt: number | null;

  eyeLevelAngle: number | null;
  headTilt: number | null;
  postureStatus: PostureStatus | null;
  slouchEventsToday: number;

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
  updateMetrics: (m: Partial<Pick<CameraState, "eyeLevelAngle" | "headTilt" | "postureStatus">>) => void;
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
      postureStatus: null,
      slouchEventsToday: 0,

      demoSliderMode: false,
      demoPostureValue: 15,
      demoEyeLevelValue: 20,

      alertsEnabled: true,
      gazeAlertsEnabled: true,
      alertSensitivity: "medium",
      alertCooldownMinutes: 3,
      lastAlertAt: null,

      setPermission: (permission) => set({ permission }),
      setMonitoring: (monitoring) =>
        set({
          monitoring,
          monitoringStartedAt: monitoring ? Date.now() : null,
        }),
      updateMetrics: (m) => set(m),
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
      partialize: (state) => ({
        alertsEnabled: state.alertsEnabled,
        gazeAlertsEnabled: state.gazeAlertsEnabled,
        alertSensitivity: state.alertSensitivity,
        alertCooldownMinutes: state.alertCooldownMinutes,
        demoPostureValue: state.demoPostureValue,
        demoEyeLevelValue: state.demoEyeLevelValue,
      }),
    }
  )
);
