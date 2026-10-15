"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";

const POSES = ["Hold up 3 fingers", "Give a thumbs up", "Touch your ear", "Put a hand on your chin", "Wave at the camera"];

type Step = "consent" | "camera" | "checking" | "result";

/**
 * Selfie verification: consent → live camera with a random pose → automatic
 * check. The selfie never leaves this check: with the mock provider nothing
 * is uploaded at all; with the real provider (AWS Face Liveness) the video
 * goes straight to the checking service and is deleted after the decision.
 */
export function VerifyDialog({ onClose, onVerified }: { onClose: () => void; onVerified: () => void }) {
  const [step, setStep] = useState<Step>("consent");
  const [pose] = useState(() => POSES[Math.floor(Math.random() * POSES.length)]);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ decision: string; message: string } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }
  useEffect(() => stopCamera, []);

  async function openCamera() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      streamRef.current = stream;
      setStep("camera");
      requestAnimationFrame(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      });
    } catch {
      setError("We need your camera for a live selfie. Allow camera access in your browser and try again.");
    }
  }

  async function check() {
    stopCamera();
    setStep("checking");
    try {
      const res = await fetch("/api/verification", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setResult({ decision: "error", message: data.error ?? "Verification failed. Please try again later." });
      } else {
        setResult({ decision: data.decision, message: data.message });
        if (data.decision === "verified") onVerified();
      }
    } catch {
      setResult({ decision: "error", message: "Can't reach togetherfit. Check your connection." });
    }
    setStep("result");
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="Get verified" className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div className="flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-border bg-surface p-5">
        {step === "consent" && (
          <>
            <h2 className="text-base font-semibold text-foreground">Get the ✓ verified badge</h2>
            <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm text-muted">
              <li>You&apos;ll take a quick live selfie.</li>
              <li>It&apos;s compared automatically with your profile photo to confirm it&apos;s really you.</li>
              <li>The selfie is deleted right after the check. We only keep &quot;verified on this date&quot;.</li>
              <li>Changing your profile photo removes the badge until you verify again.</li>
            </ul>
            {error && <p className="text-xs text-danger">{error}</p>}
            <div className="flex gap-2">
              <button onClick={openCamera} className="flex-1 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-black hover:opacity-90">
                I agree, open camera
              </button>
              <button onClick={onClose} className="rounded-full border border-border px-4 py-2 text-sm text-foreground hover:bg-surface-2">
                Not now
              </button>
            </div>
          </>
        )}

        {step === "camera" && (
          <>
            <h2 className="text-base font-semibold text-foreground">{pose}</h2>
            <video ref={videoRef} autoPlay playsInline muted className="aspect-square w-full -scale-x-100 rounded-xl bg-black object-cover" />
            <p className="text-xs text-muted">Face the camera in good light, then tap the button.</p>
            <div className="flex gap-2">
              <button onClick={check} className="flex-1 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-black hover:opacity-90">
                Take selfie
              </button>
              <button
                onClick={() => {
                  stopCamera();
                  onClose();
                }}
                className="rounded-full border border-border px-4 py-2 text-sm text-foreground hover:bg-surface-2"
              >
                Cancel
              </button>
            </div>
          </>
        )}

        {step === "checking" && <p className="py-6 text-center text-sm text-muted">Checking…</p>}

        {step === "result" && result && (
          <>
            <div className="flex justify-center">
              <Icon name={result.decision === "verified" ? "status.done" : "action.repeat"} size={40} weight={result.decision === "verified" ? "fill" : "regular"} className={result.decision === "verified" ? "text-sky-500" : "text-muted"} />
            </div>
            <p className="text-center text-sm text-foreground">{result.message}</p>
            <button onClick={onClose} className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-black hover:opacity-90">
              {result.decision === "verified" ? "Done" : "Close"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
