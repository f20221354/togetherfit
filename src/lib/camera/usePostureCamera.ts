"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useCameraStore } from "@/lib/store/cameraStore";
import { useWellnessStore } from "@/lib/store/wellnessStore";
import { readingFromTransformMatrix } from "./postureAnalysis";
import { NudgeEvent, NudgeTracker } from "./postureNudges";
import { deliverNudge } from "./nudgeDelivery";

const MEDIAPIPE_VERSION = "1.0.1";
const WASM_BASE = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

const DETECTION_INTERVAL_MS = 400; // ~2.5 inferences/sec — throttled on purpose (browsers slow hidden tabs to ~1/sec)
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

// Chrome/Edge's ImageCapture reads frames straight from the camera track, which keeps
// working while the tab is in the background (a hidden <video> may stop updating).
interface ImageCaptureLike {
  grabFrame(): Promise<ImageBitmap>;
}
type ImageCaptureCtor = new (track: MediaStreamTrack) => ImageCaptureLike;

/**
 * Runs the camera + posture/gaze detection. Mounted once for the whole
 * dashboard (PostureMonitorProvider) so monitoring keeps going on other
 * pages and while the tab is in the background; nudges reach the user via
 * the in-app toast or, when the window isn't focused, a system notification.
 */
export function usePostureCamera(videoRef: React.RefObject<HTMLVideoElement | null>) {
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const captureRef = useRef<ImageCaptureLike | null>(null);
  const trackerRef = useRef(new NudgeTracker());
  const [stream, setStream] = useState<MediaStream | null>(null);

  const setPermission = useCameraStore((s) => s.setPermission);
  const setMonitoring = useCameraStore((s) => s.setMonitoring);
  const updateMetrics = useCameraStore((s) => s.updateMetrics);
  const registerSlouchEvent = useCameraStore((s) => s.registerSlouchEvent);
  const markAlertFired = useCameraStore((s) => s.markAlertFired);
  const setNudgeStates = useCameraStore((s) => s.setNudgeStates);
  const logEvent = useWellnessStore((s) => s.logEvent);

  const loopRef = useRef<() => void>(() => {});

  const stop = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    captureRef.current = null;
    setStream(null);
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
      if ((event.type === "warning" || event.type === "reminder") && event.notify) {
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
    let frame: ImageBitmap | null = null;
    try {
      if (document.hidden && captureRef.current) frame = await captureRef.current.grabFrame();
    } catch {
      frame = null; // fall back to the video element below
    }
    const source = frame ?? (video.readyState >= 2 ? video : null);
    if (source) {
      try {
        const landmarker = await getLandmarker();
        const result = landmarker.detectForVideo(source, now);
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
      } finally {
        frame?.close();
      }
    }

    if (streamRef.current) timerRef.current = setTimeout(() => loopRef.current(), DETECTION_INTERVAL_MS);
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
      const Capture = (window as unknown as { ImageCapture?: ImageCaptureCtor }).ImageCapture;
      const track = stream.getVideoTracks()[0];
      captureRef.current = Capture && track ? new Capture(track) : null;
      setPermission("granted");

      await getLandmarker();

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setStream(stream);
      setMonitoring(true);
      trackerRef.current = new NudgeTracker();
      timerRef.current = setTimeout(() => loopRef.current(), 0);
    } catch (err) {
      const name = err instanceof DOMException ? err.name : "";
      if (name === "NotAllowedError" || name === "SecurityError") setPermission("denied");
      else if (name === "NotFoundError" || name === "OverconstrainedError") setPermission("unavailable");
      else if (name === "NotReadableError") setPermission("unavailable");
      else setPermission("unavailable");
    }
  }, [setMonitoring, setPermission, videoRef]);

  useEffect(() => stop, [stop]);

  return { start, stop, stream };
}
