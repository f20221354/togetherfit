"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore, useCurrentUser, WellnessSetupPrefs } from "@/lib/auth/authStore";
import { useCameraStore } from "@/lib/store/cameraStore";
import { PhotoEditor } from "@/components/profile/PhotoEditor";
import { MatchingSettings } from "@/components/profile/MatchingSettings";
import { Icon } from "@/components/ui/Icon";

const CAPABILITIES = [
  { icon: "nav.connect" as const, label: "Connect", detail: "Find real people for running, gym, and walking" },
  { icon: "nav.move" as const, label: "Move & Coach", detail: "Goals, workouts, and AI-guided training" },
  { icon: "module.sanctuary" as const, label: "Sanctuary", detail: "A bio-room, plus light and sleep rhythm guidance" },
  { icon: "module.posture" as const, label: "Posture & Gaze Guard", detail: "Camera-based posture and eye-level monitoring" },
  { icon: "module.reset" as const, label: "UrgeSurfer", detail: "Breathe, Rhythm, or Ground — fast recovery resets" },
];

type CameraStepResult = "granted" | "denied" | "skipped" | null;

const FIRST_ACTIONS = [
  { title: "Find someone to walk with today", detail: "See who's nearby and free right now.", href: "/connect/find?sport=walking" },
  { title: "Set your first goal", detail: "A weekly target you can actually track.", href: "/move/goals" },
  { title: "Do a 1-minute posture check", detail: "Uses your camera on this device. Nothing is recorded.", href: "/posture" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const loaded = useAuthStore((s) => s.loaded);
  const refresh = useAuthStore((s) => s.refresh);
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

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | undefined>();

  useEffect(() => {
    if (!loaded) {
      refresh();
      return;
    }
    if (!user) router.replace("/login");
    else if (user.onboardingComplete) router.replace("/");
  }, [loaded, user, refresh, router]);

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

  async function finish(destination: string) {
    if (!user || saving) return;
    setSaving(true);
    setSaveError(undefined);
    const ok = await completeOnboarding(prefs, cameraResult === "granted");
    setSaving(false);
    if (!ok) {
      setSaveError("Couldn't save your setup. Check your connection and try again.");
      return;
    }
    router.push(destination);
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-5 sm:p-8">
        <div className="mb-6 flex items-center justify-center gap-1.5">
          {[1, 2, 3, 4, 5].map((s) => (
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
              Welcome to togetherfit{user ? `, ${user.name.split(" ")[0]}` : ""}.
            </h2>
            <p className="text-sm text-muted">
              Five connected capabilities, working together for you.
            </p>
            <div className="flex flex-col gap-2 text-left">
              {CAPABILITIES.map((c) => (
                <div key={c.label} className="flex items-center gap-3 rounded-xl bg-surface-2 p-3">
                  <Icon name={c.icon} size={22} className="text-accent-foreground" />
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
            <Icon name="module.posture" size={36} className="mx-auto text-accent-foreground" />
            <h2 className="text-xl font-semibold text-foreground">Posture & Gaze Guard</h2>
            <p className="text-sm text-muted">
              togetherfit can use your camera to estimate posture and eye/head alignment.
            </p>
            <div className="rounded-xl bg-surface-2 p-3 text-left text-xs text-muted">
              Your camera feed is processed locally in your browser. togetherfit does not record,
              upload, or store camera video.
            </div>

            {cameraResult === "granted" && (
              <div className="rounded-lg bg-success/10 px-3 py-2 text-xs text-success">
                Camera access granted.
              </div>
            )}
            {cameraResult === "denied" && (
              <div className="rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning">
                Camera access wasn&apos;t granted. You can still use togetherfit — enable it later from
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
              <Icon name="nav.settings" size={36} className="mx-auto text-accent-foreground" />
              <h2 className="mt-2 text-xl font-semibold text-foreground">Wellness Setup</h2>
              <p className="text-sm text-muted">Optional — helps togetherfit tailor recommendations.</p>
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
          <div className="flex flex-col gap-5">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-foreground">About you</h2>
              <p className="mt-1 text-sm text-muted">
                Optional. Helps people you meet through Find a Friend feel safe. You can change it any time in Settings.
              </p>
            </div>
            <PhotoEditor />
            <MatchingSettings compact />
            <div className="flex gap-2">
              <button
                onClick={() => setStep(5)}
                className="flex-1 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-black hover:opacity-90"
              >
                Continue
              </button>
              <button
                onClick={() => setStep(5)}
                className="rounded-xl border border-border px-4 py-2.5 text-sm text-muted hover:text-foreground"
              >
                Skip
              </button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="flex flex-col items-center gap-5 text-center">
            <span className="text-4xl">✓</span>
            <h2 className="text-xl font-semibold text-foreground">What would you like to do first?</h2>
            <p className="text-sm text-muted">Pick one to start. Everything else is a tap away.</p>
            {saveError && <p className="text-xs text-danger">{saveError}</p>}
            <div className="flex w-full flex-col gap-2 text-left">
              {FIRST_ACTIONS.map((a) => (
                <button
                  key={a.href}
                  onClick={() => finish(a.href)}
                  disabled={saving}
                  className="flex flex-col rounded-xl border border-border px-4 py-3 hover:border-accent hover:bg-accent/5 disabled:opacity-60"
                >
                  <span className="text-sm font-semibold text-foreground">{a.title}</span>
                  <span className="text-xs text-muted">{a.detail}</span>
                </button>
              ))}
            </div>
            <button onClick={() => finish("/")} disabled={saving} className="text-xs text-muted hover:text-foreground disabled:opacity-60">
              {saving ? "Saving…" : "Skip to Home"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
