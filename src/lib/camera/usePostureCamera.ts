"use client";

import { useCallback, useEffect, useRef } from "react";
import { useCameraStore } from "@/lib/store/cameraStore";
import { useWellnessStore } from "@/lib/store/wellnessStore";
import { readingFromTransformMatrix } from "./postureAnalysis";
import { NudgeEvent, NudgeTracker } from "./postureNudges";
import { deliverNudge } from "./nudgeDelivery";

const MEDIAPIPE_VERSION = "1.0.1";
const WASM_BASE = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

const DETECTION_INTERVAL_MS = 400; // ~2.5 inferences/sec — throttled on purpose
// Persistence, recovery and cooldown rules live in postureNudges.ts (NUDGE_CONFIG).

// Module-scoped so the (large, cached) model is only downloaded once per tab.
let landmarkerPromise: Promise<import("@mediapipe/tasks-vision").FaceLandmarker> | null = null;

async function getLandmarker() {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
      const fileset = await FilesetResolver.forVisionTasks(WASM_BASE);
      return FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
        outputFacialTransformationMatrixes: true,
        outputFaceBlendshapes: false,
        runningMode: "VIDEO",
        numFaces: 1,
        // Slightly stricter than the 0.5 defaults so shaky detections read as "no face", not bad posture.
        minFaceDetectionConfidence: 0.6,
        minFacePresenceConfidence: 0.6,
        minTrackingConfidence: 0.6,
      });
    })().catch((err) => {
      landmarkerPromise = null;
      throw err;
    });
  }
  return landmarkerPromise;
}

export function usePostureCamera(videoRef: React.RefObject<HTMLVideoElement | null>) {
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastDetectAtRef = useRef(0);
  const trackerRef = useRef(new NudgeTracker());

  const setPermission = useCameraStore((s) => s.setPermission);
  const setMonitoring = useCameraStore((s) => s.setMonitoring);
  const updateMetrics = useCameraStore((s) => s.updateMetrics);
  const registerSlouchEvent = useCameraStore((s) => s.registerSlouchEvent);
  const markAlertFired = useCameraStore((s) => s.markAlertFired);
  const setNudgeStates = useCameraStore((s) => s.setNudgeStates);
  const logEvent = useWellnessStore((s) => s.logEvent);

  const loopRef = useRef<() => void>(() => {});

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    trackerRef.current.pause();
    setNudgeStates("no-detection", "no-detection");
    setMonitoring(false);
    updateMetrics({ eyeLevelAngle: null, headTilt: null, headTurn: null, postureStatus: null });
  }, [setMonitoring, setNudgeStates, updateMetrics, videoRef]);

  const handleEvent = useCallback(
    (event: NudgeEvent) => {
      if (event.kind === "posture" && event.type === "warning") {
        registerSlouchEvent();
        logEvent("slouch_detected", { duration: Math.round(event.sustainedMs / 1000) });
      }
      if (event.kind === "posture" && event.type === "recovered") logEvent("posture_alignment_restored");
      if (event.type === "warning" && event.notify) {
        markAlertFired();
        deliverNudge(event.kind);
      }
    },
    [logEvent, markAlertFired, registerSlouchEvent]
  );

  const loop = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !streamRef.current) return;

    const now = performance.now();
    if (now - lastDetectAtRef.current >= DETECTION_INTERVAL_MS && video.readyState >= 2) {
      lastDetectAtRef.current = now;
      try {
        const landmarker = await getLandmarker();
        const result = landmarker.detectForVideo(video, now);
        const matrix = result.facialTransformationMatrixes?.[0]?.data;
        const reading = matrix ? readingFromTransformMatrix(matrix) : null;
        updateMetrics({
          eyeLevelAngle: reading?.eyeLevelAngle ?? null,
          headTilt: reading?.headTilt ?? null,
          headTurn: reading?.headTurn ?? null,
          postureStatus: reading?.postureStatus ?? null,
        });

        // Settings are read fresh each tick so changes apply without restarting the camera.
        const { alertsEnabled, gazeAlertsEnabled, alertSensitivity, alertCooldownMinutes } = useCameraStore.getState();
        const events = trackerRef.current.update(now, reading, {
          sensitivity: alertSensitivity,
          cooldownMs: alertCooldownMinutes * 60_000,
          postureEnabled: alertsEnabled,
          gazeEnabled: gazeAlertsEnabled,
        });
        const states = trackerRef.current.states;
        setNudgeStates(states.posture, states.gaze);
        events.forEach(handleEvent);
      } catch {
        // A transient inference failure shouldn't crash monitoring; next tick retries.
      }
    }

    rafRef.current = requestAnimationFrame(() => loopRef.current());
  }, [handleEvent, setNudgeStates, updateMetrics, videoRef]);

  useEffect(() => {
    loopRef.current = loop;
  }, [loop]);

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setPermission("unavailable");
      return;
    }
    if (typeof window !== "undefined" && !window.isSecureContext) {
      setPermission("insecure-context");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 480, height: 360, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      setPermission("granted");

      await getLandmarker();

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setMonitoring(true);
      lastDetectAtRef.current = 0;
      trackerRef.current = new NudgeTracker();
      rafRef.current = requestAnimationFrame(() => loopRef.current());
    } catch (err) {
      const name = err instanceof DOMException ? err.name : "";
      if (name === "NotAllowedError" || name === "SecurityError") setPermission("denied");
      else if (name === "NotFoundError" || name === "OverconstrainedError") setPermission("unavailable");
      else if (name === "NotReadableError") setPermission("unavailable");
      else setPermission("unavailable");
    }
  }, [setMonitoring, setPermission, videoRef]);

  // requestAnimationFrame already stops while the tab is hidden; also clear the timers so
  // time spent in another tab never counts towards a warning.
  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === "hidden") {
        trackerRef.current.pause();
        setNudgeStates("no-detection", "no-detection");
      }
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [setNudgeStates]);

  useEffect(() => stop, [stop]);

  return { start, stop };
}
