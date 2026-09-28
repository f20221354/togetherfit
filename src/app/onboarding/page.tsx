"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore, useCurrentUser, WellnessSetupPrefs } from "@/lib/auth/authStore";
import { useCameraStore } from "@/lib/store/cameraStore";

const CAPABILITIES = [
  { icon: "🌿", label: "Sanctuary", detail: "A bio-room that reflects your wellness state" },
  { icon: "👁", label: "Posture & Gaze Guard", detail: "Camera-based posture and eye-level monitoring" },
  { icon: "🫁", label: "UrgeSurfer", detail: "90-second resets for stress and tension" },
  { icon: "☀️", label: "Circadian Arc", detail: "Light and sleep timing guidance" },
  { icon: "🚶", label: "Micro-Stroll", detail: "15-minute sunlight walks" },
];

type CameraStepResult = "granted" | "denied" | "skipped" | null;

export default function OnboardingPage() {
  const router = useRouter();
  const currentUserEmail = useAuthStore((s) => s.currentUserEmail);
  const onboardingComplete = useAuthStore((s) => s.onboardingComplete);
  const completeOnboarding = useAuthStore((s) => s.completeOnboarding);
  const setPermission = useCameraStore((s) => s.setPermission);
  const user = useCurrentUser();

  const [step, setStep] = useState(1);
  const [cameraResult, setCameraResult] = useState<CameraStepResult>(null);
  const [cameraRequesting, setCameraRequesting] = useState(false);
  const [prefs, setPrefs] = useState<WellnessSetupPrefs>({
    wakeTime: "07:00",
    sleepTime: "23:00",
    workDurationHours: 8,
    preferredWalkMinutes: 15,
  });

  useEffect(() => {
    if (!currentUserEmail) {
      router.replace("/login");
      return;
    }
    if (onboardingComplete[currentUserEmail]) {
      router.replace("/");
    }
  }, [currentUserEmail, onboardingComplete, router]);

  async function requestCamera() {
    setCameraRequesting(true);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraResult("denied");
        setPermission("unavailable");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      stream.getTracks().forEach((t) => t.stop());
      setCameraResult("granted");
      setPermission("granted");
    } catch {
      setCameraResult("denied");
      setPermission("denied");
    } finally {
      setCameraRequesting(false);
    }
  }

  function finish() {
    if (!currentUserEmail) return;
    completeOnboarding(currentUserEmail, prefs, cameraResult === "granted");
    router.push("/");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-8">
        <div className="mb-6 flex items-center justify-center gap-1.5">
          {[1, 2, 3, 4].map((s) => (
            <span
              key={s}
              className={`h-1.5 w-8 rounded-full transition-colors ${
                s <= step ? "bg-accent" : "bg-surface-2"
              }`}
            />
          ))}
        </div>

        {step === 1 && (
          <div className="flex flex-col gap-5 text-center">
            <h2 className="text-xl font-semibold text-foreground">
              Welcome to VitaOS{user ? `, ${user.name.split(" ")[0]}` : ""}.
            </h2>
            <p className="text-sm text-muted">
              One wellness operating system with five interconnected capabilities.
            </p>
            <div className="flex flex-col gap-2 text-left">
              {CAPABILITIES.map((c) => (
                <div key={c.label} className="flex items-center gap-3 rounded-xl bg-surface-2 p-3">
                  <span className="text-xl">{c.icon}</span>
                  <div>
                    <div className="text-sm font-medium text-foreground">{c.label}</div>
                    <div className="text-xs text-muted">{c.detail}</div>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setStep(2)}
              className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-black hover:opacity-90"
            >
              Continue
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-5 text-center">
            <span className="text-3xl">👁</span>
            <h2 className="text-xl font-semibold text-foreground">Posture & Gaze Guard</h2>
            <p className="text-sm text-muted">
              VitaOS can use your camera to estimate posture and eye/head alignment.
            </p>
            <div className="rounded-xl bg-surface-2 p-3 text-left text-xs text-muted">
              Your camera feed is processed locally in your browser. VitaOS does not record,
              upload, or store camera video.
            </div>

            {cameraResult === "granted" && (
              <div className="rounded-lg bg-success/10 px-3 py-2 text-xs text-success">
                Camera access granted.
              </div>
            )}
            {cameraResult === "denied" && (
              <div className="rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning">
                Camera access wasn&apos;t granted. You can still use VitaOS — enable it later from
                Settings.
              </div>
            )}

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                onClick={requestCamera}
                disabled={cameraRequesting || cameraResult === "granted"}
                className="flex-1 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-60"
              >
                {cameraRequesting
                  ? "Requesting…"
                  : cameraResult === "granted"
                    ? "Camera Allowed ✓"
                    : "Allow Camera"}
              </button>
              <button
                onClick={() => {
                  setCameraResult("skipped");
                  setStep(3);
                }}
                className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-surface-2"
              >
                Skip for Now
              </button>
            </div>
            {cameraResult === "granted" && (
              <button
                onClick={() => setStep(3)}
                className="text-xs font-medium text-accent-foreground hover:underline"
              >
                Continue →
              </button>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-5">
            <div className="text-center">
              <span className="text-3xl">⚙️</span>
              <h2 className="mt-2 text-xl font-semibold text-foreground">Wellness Setup</h2>
              <p className="text-sm text-muted">Optional — helps VitaOS tailor recommendations.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-xs text-muted">
                Typical wake time
                <input
                  type="time"
                  value={prefs.wakeTime}
                  onChange={(e) => setPrefs((p) => ({ ...p, wakeTime: e.target.value }))}
                  className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-muted">
                Typical sleep time
                <input
                  type="time"
                  value={prefs.sleepTime}
                  onChange={(e) => setPrefs((p) => ({ ...p, sleepTime: e.target.value }))}
                  className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-muted">
                Work/study hours per day
                <input
                  type="number"
                  min={0}
                  max={16}
                  value={prefs.workDurationHours}
                  onChange={(e) =>
                    setPrefs((p) => ({ ...p, workDurationHours: Number(e.target.value) }))
                  }
                  className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-muted">
                Preferred walk (min)
                <input
                  type="number"
                  min={5}
                  max={60}
                  step={5}
                  value={prefs.preferredWalkMinutes}
                  onChange={(e) =>
                    setPrefs((p) => ({ ...p, preferredWalkMinutes: Number(e.target.value) }))
                  }
                  className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground"
                />
              </label>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setStep(4)}
                className="flex-1 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-black hover:opacity-90"
              >
                Continue
              </button>
              <button
                onClick={() => setStep(4)}
                className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-surface-2"
              >
                Skip
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="flex flex-col items-center gap-5 text-center">
            <span className="text-4xl">✓</span>
            <h2 className="text-xl font-semibold text-foreground">You&apos;re ready.</h2>
            <p className="text-sm text-muted">
              VitaOS is set up. Your Global Wellness Score and all five modules are ready to go.
            </p>
            <button
              onClick={finish}
              className="rounded-xl bg-accent px-6 py-2.5 text-sm font-semibold text-black hover:opacity-90"
            >
              Enter VitaOS
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
