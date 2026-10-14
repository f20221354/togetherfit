import { CameraPermissionState } from "@/lib/store/cameraStore";
import { Icon } from "@/components/ui/Icon";

const MESSAGES: Record<Exclude<CameraPermissionState, "granted" | "unknown">, string> = {
  denied:
    "Camera access was denied. You can allow it again from your browser's site settings, or continue without it.",
  unavailable: "We couldn't access your camera. It may be in use by another app, or no camera was detected.",
  "insecure-context": "Camera access requires a secure (HTTPS) connection.",
};

export function CameraUnavailablePanel({
  permission,
  onRetry,
}: {
  permission: Exclude<CameraPermissionState, "granted" | "unknown">;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface-2 p-6 text-center">
      <Icon name="object.camera" size={28} className="text-muted" />
      <h3 className="text-sm font-semibold text-foreground">Camera unavailable</h3>
      <p className="max-w-sm text-xs text-muted">{MESSAGES[permission]}</p>
      <p className="text-xs text-muted">Everything else in togetherfit works without the camera.</p>
      <div className="mt-1 flex gap-2">
        <button
          onClick={onRetry}
          className="rounded-full bg-accent px-4 py-2 text-xs font-semibold text-black hover:opacity-90"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
