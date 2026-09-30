"use client";

import { createContext, useContext, useRef } from "react";
import { usePostureCamera } from "@/lib/camera/usePostureCamera";

interface PostureMonitor {
  start: () => Promise<void>;
  stop: () => void;
  /** The live camera stream, for showing a preview; null when not monitoring. */
  stream: MediaStream | null;
}

const PostureMonitorContext = createContext<PostureMonitor | null>(null);

/**
 * Owns posture/gaze monitoring for the whole dashboard, so it keeps running
 * when you move to another page or another app. The detector reads from the
 * hidden video element below; the Posture page only shows a preview of the same stream.
 */
export function PostureMonitorProvider({ children }: { children: React.ReactNode }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const monitor = usePostureCamera(videoRef);

  return (
    <PostureMonitorContext.Provider value={monitor}>
      {children}
      <video
        ref={videoRef}
        muted
        playsInline
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 h-px w-px opacity-0"
      />
    </PostureMonitorContext.Provider>
  );
}

export function usePostureMonitor(): PostureMonitor {
  const monitor = useContext(PostureMonitorContext);
  if (!monitor) throw new Error("usePostureMonitor must be used inside PostureMonitorProvider");
  return monitor;
}
