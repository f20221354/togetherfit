"use client";

import { useCallback, useEffect, useRef } from "react";
import { useCameraStore } from "@/lib/store/cameraStore";
import { useWellnessStore } from "@/lib/store/wellnessStore";
import { readingFromTransformMatrix } from "./postureAnalysis";

const MEDIAPIPE_VERSION = "1.0.1";
const WASM_BASE = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

const DETECTION_INTERVAL_MS = 400; // ~2.5 inferences/sec — throttled on purpose
const SUSTAINED_WARNING_MS = 12_000; // spec: >10-15s of downward posture before alerting

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
  const badSinceRef = useRef<number | null>(null);
  const goodSinceRef = useRef<number | null>(null);
  const wasBadRef = useRef(false);

  const setPermission = useCameraStore((s) => s.setPermission);
  const setMonitoring = useCameraStore((s) => s.setMonitoring);
  const updateMetrics = useCameraStore((s) => s.updateMetrics);
  const registerSlouchEvent = useCameraStore((s) => s.registerSlouchEvent);
  const alertsEnabled = useCameraStore((s) => s.alertsEnabled);
  const canFireAlert = useCameraStore((s) => s.canFireAlert);
  const markAlertFired = useCameraStore((s) => s.markAlertFired);
  const logEvent = useWellnessStore((s) => s.logEvent);

  const loopRef = useRef<() => void>(() => {});

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    badSinceRef.current = null;
    goodSinceRef.current = null;
    setMonitoring(false);
    updateMetrics({ eyeLevelAngle: null, headTilt: null, postureStatus: null });
  }, [setMonitoring, updateMetrics, videoRef]);

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

        if (matrix) {
          const reading = readingFromTransformMatrix(matrix);
          updateMetrics({
            eyeLevelAngle: reading.eyeLevelAngle,
            headTilt: reading.headTilt,
            postureStatus: reading.postureStatus,
          });

          const isBad = reading.postureStatus === "elevated-risk";
          if (isBad) {
            goodSinceRef.current = null;
            if (badSinceRef.current === null) badSinceRef.current = now;
            const sustained = now - badSinceRef.current;
            if (sustained >= SUSTAINED_WARNING_MS && !wasBadRef.current) {
              wasBadRef.current = true;
              registerSlouchEvent();
              logEvent("slouch_detected", { duration: Math.round(sustained / 1000) });
              if (alertsEnabled && canFireAlert()) markAlertFired();
            }
          } else {
            badSinceRef.current = null;
            if (goodSinceRef.current === null) goodSinceRef.current = now;
            if (wasBadRef.current && now - goodSinceRef.current >= 2000) {
              wasBadRef.current = false;
              logEvent("posture_alignment_restored");
            }
          }
        } else {
          updateMetrics({ eyeLevelAngle: null, headTilt: null, postureStatus: null });
        }
      } catch {
        // A transient inference failure shouldn't crash monitoring; next tick retries.
      }
    }

    rafRef.current = requestAnimationFrame(() => loopRef.current());
  }, [alertsEnabled, canFireAlert, logEvent, markAlertFired, registerSlouchEvent, updateMetrics, videoRef]);

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
      badSinceRef.current = null;
      goodSinceRef.current = null;
      wasBadRef.current = false;
      rafRef.current = requestAnimationFrame(() => loopRef.current());
    } catch (err) {
      const name = err instanceof DOMException ? err.name : "";
      if (name === "NotAllowedError" || name === "SecurityError") setPermission("denied");
      else if (name === "NotFoundError" || name === "OverconstrainedError") setPermission("unavailable");
      else if (name === "NotReadableError") setPermission("unavailable");
      else setPermission("unavailable");
    }
  }, [setMonitoring, setPermission, videoRef]);

  useEffect(() => stop, [stop]);

  return { start, stop };
}
