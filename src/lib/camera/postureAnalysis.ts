import { PostureStatus } from "@/lib/store/cameraStore";

export interface PostureReading {
  eyeLevelAngle: number; // degrees, 90 = level, lower = looking further down
  headTilt: number; // degrees, absolute deviation from upright
  headTurn: number; // degrees, absolute left/right turn away from the camera
  postureStatus: PostureStatus;
  faceDetected: boolean;
}

/**
 * Derives an eye-level / head-tilt estimate from a MediaPipe FaceLandmarker
 * facial transformation matrix (a 4x4, column-major model-to-camera
 * transform). This is a lightweight heuristic for "looking down at a
 * screen for a while", not a clinical measurement — language in the UI
 * should stay in terms of "posture appears elevated-risk", never a
 * diagnosis.
 */
export function readingFromTransformMatrix(matrixData: Float32Array | number[]): PostureReading {
  const m = matrixData;
  // Column-major 4x4: element (row, col) = m[col * 4 + row]
  const m00 = m[0];
  const m10 = m[1];
  const m20 = m[2];
  const m21 = m[6];
  const m22 = m[10];

  const pitchRad = Math.atan2(m21, m22);
  const rollRad = Math.atan2(m10, m00);
  const yawRad = Math.atan2(-m20, Math.hypot(m21, m22));

  const pitchDeg = (pitchRad * 180) / Math.PI;
  const rollDeg = (rollRad * 180) / Math.PI;
  const yawDeg = (yawRad * 180) / Math.PI;

  const eyeLevelAngle = clamp(90 - Math.abs(pitchDeg), 0, 90);
  const headTilt = Math.round(Math.abs(rollDeg));

  return {
    eyeLevelAngle: Math.round(eyeLevelAngle),
    headTilt,
    headTurn: Math.round(Math.abs(yawDeg)),
    postureStatus: statusFromAngle(eyeLevelAngle),
    faceDetected: true,
  };
}

export function statusFromAngle(eyeLevelAngle: number): PostureStatus {
  if (eyeLevelAngle >= 75) return "optimal";
  if (eyeLevelAngle >= 55) return "mild";
  return "elevated-risk";
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
