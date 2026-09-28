"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { useWellnessStore } from "@/lib/store/wellnessStore";
import { useBreathingStore } from "@/lib/store/breathingStore";
import { useBreathingEngine } from "@/lib/breathing/useBreathingEngine";
import { BreathingPattern, formatPattern } from "@/lib/breathing/types";
import { DEFAULT_SESSION_DURATION, SESSION_DURATION_OPTIONS } from "@/lib/breathing/presets";
import { primeAudio, playPhaseCue, vibrate } from "@/lib/breathing/audio";
import { PageHeader } from "@/components/shell/PageHeader";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { BreathingCircle } from "@/components/urgesurfer/BreathingCircle";
import { PatternEditor } from "@/components/urgesurfer/PatternEditor";
import { UrgeScale } from "@/components/urgesurfer/UrgeScale";
import { SavedPatternsPanel } from "@/components/urgesurfer/SavedPatternsPanel";
import { HistoryPanel } from "@/components/urgesurfer/HistoryPanel";
import { CompletionScreen } from "@/components/urgesurfer/CompletionScreen";
import { RhythmReset } from "@/components/urgesurfer/RhythmReset";
import { GroundingReset } from "@/components/urgesurfer/GroundingReset";
import { ActivityExplorer } from "@/components/dashboard/ActivityExplorer";

type Stage = "setup" | "session" | "rateAfter" | "complete";
type ResetMode = "breathe" | "rhythm" | "ground";

const RESET_MODES: { key: ResetMode; icon: string; label: string; detail: string }[] = [
  { key: "breathe", icon: "🫁", label: "Breathe", detail: "Custom breathing" },
  { key: "rhythm", icon: "🥁", label: "Rhythm", detail: "Follow a pulse" },
  { key: "ground", icon: "👁", label: "Ground", detail: "5-4-3-2-1" },
];

function isToday(iso: string): boolean {
  return new Date(iso).toDateString() === new Date().toDateString();
}

export default function UrgeSurferPage() {
  const scores = useWellnessStore((s) => s.scores);
  const logWellnessEvent = useWellnessStore((s) => s.logEvent);
  const urgeSurferResetsToday = useWellnessStore((s) => s.urgeSurferResetsToday);

  const lastPattern = useBreathingStore((s) => s.lastPattern);
  const lastSessionDuration = useBreathingStore((s) => s.lastSessionDuration);
  const setLastPattern = useBreathingStore((s) => s.setLastPattern);
  const setLastSessionDuration = useBreathingStore((s) => s.setLastSessionDuration);
  const logSession = useBreathingStore((s) => s.logSession);
  const history = useBreathingStore((s) => s.history);
  const soundEnabled = useBreathingStore((s) => s.soundEnabled);
  const hapticsEnabled = useBreathingStore((s) => s.hapticsEnabled);
  const setSoundEnabled = useBreathingStore((s) => s.setSoundEnabled);
  const setHapticsEnabled = useBreathingStore((s) => s.setHapticsEnabled);

  const [resetMode, setResetMode] = useState<ResetMode>("breathe");
  const [pattern, setPattern] = useState<BreathingPattern>(lastPattern);
  const [sessionDuration, setSessionDuration] = useState(lastSessionDuration || DEFAULT_SESSION_DURATION);
  const [stage, setStage] = useState<Stage>("setup");
  const [urgeBefore, setUrgeBefore] = useState<number | null>(null);
  const [urgeAfter, setUrgeAfter] = useState<number | null>(null);
  const [trackUrge, setTrackUrge] = useState(false);
  const [completedCycles, setCompletedCycles] = useState(0);
  const [rhythmResult, setRhythmResult] = useState<{ duration: number; tapCount: number; consistency: number } | null>(null);
  const [groundComplete, setGroundComplete] = useState(false);

  const soundEnabledRef = useRef(soundEnabled);
  const hapticsEnabledRef = useRef(hapticsEnabled);
  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
    hapticsEnabledRef.current = hapticsEnabled;
  }, [soundEnabled, hapticsEnabled]);

  const handlePhaseChange = useMemo(
    () => (phase: Parameters<NonNullable<Parameters<typeof useBreathingEngine>[2]>>[0]) => {
      if (soundEnabledRef.current) playPhaseCue(phase);
      if (hapticsEnabledRef.current) vibrate(phase === "inhale" || phase === "exhale" ? 40 : 15);
    },
    []
  );

  const handleComplete = useMemo(
    () => (cyclesCompleted: number) => {
      setCompletedCycles(cyclesCompleted);
      logWellnessEvent("urge_reset_completed", { duration: sessionDuration });
      if (trackUrge) {
        setStage("rateAfter");
      } else {
        logSession({
          pattern,
          sessionDuration,
          cyclesCompleted,
          completed: true,
        });
        setStage("complete");
      }
    },
    [logWellnessEvent, sessionDuration, trackUrge, logSession, pattern]
  );

  const engine = useBreathingEngine(pattern, sessionDuration, handlePhaseChange, handleComplete);

  useEffect(() => {
    setLastPattern(pattern);
  }, [pattern, setLastPattern]);

  useEffect(() => {
    setLastSessionDuration(sessionDuration);
  }, [sessionDuration, setLastSessionDuration]);

  function selectMode(mode: ResetMode) {
    if (mode === resetMode) return;
    engine.stop();
    setStage("setup");
    setRhythmResult(null);
    setGroundComplete(false);
    setResetMode(mode);
  }

  function handleStart() {
    primeAudio();
    setUrgeAfter(null);
    engine.start();
    setStage("session");
  }

  function handleRestart() {
    engine.restart();
    setStage("session");
  }

  function confirmUrgeAfter(value: number) {
    setUrgeAfter(value);
    logSession({
      pattern,
      sessionDuration,
      cyclesCompleted: completedCycles,
      completed: true,
      urgeBefore: urgeBefore ?? undefined,
      urgeAfter: value,
    });
    setStage("complete");
  }

  function backToSetup() {
    engine.stop();
    setStage("setup");
    setRhythmResult(null);
    setGroundComplete(false);
  }

  function handleRhythmComplete(result: { duration: number; tapCount: number; consistency: number }) {
    logWellnessEvent("rhythm_reset_completed", { duration: result.duration });
    setRhythmResult(result);
  }

  function handleGroundComplete() {
    logWellnessEvent("grounding_completed");
    setGroundComplete(true);
  }

  const todayHistory = history.filter((h) => isToday(h.timestamp));
  const totalMinutesToday = Math.round(todayHistory.reduce((sum, h) => sum + h.sessionDuration, 0) / 60);
  const streak = useMemo(() => {
    const days = new Set(history.map((h) => new Date(h.timestamp).toDateString()));
    let count = 0;
    const cursor = new Date();
    while (days.has(cursor.toDateString())) {
      count += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return count;
  }, [history]);

  const tension = Math.max(0, 100 - scores.recovery);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <PageHeader icon="🫁" title="UrgeSurfer" subtitle="Ride the wave. Reset your attention on your own terms." />

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="flex flex-col items-center gap-5 rounded-2xl border border-border bg-surface p-6">
          {resetMode === "breathe" && (
            <>
              <BreathingCircle
                scale={engine.scale}
                phase={stage === "session" ? engine.state.phase : null}
                countdown={stage === "session" ? engine.state.phaseRemaining : null}
                idleLabel={stage === "setup" ? "Ready when you are" : undefined}
              />

              {stage === "session" && (
                <div className="flex w-full max-w-xs flex-col gap-2">
                  <ProgressBar value={engine.state.progress * 100} tone="good" />
                  <div className="flex items-center justify-between text-xs text-muted">
                    <span>
                      Cycle {engine.state.cycle} · Phase {engine.state.phaseElapsed}/{engine.state.phaseDuration}s
                    </span>
                    <span>{engine.state.sessionRemaining}s left</span>
                  </div>
                  <div className="text-center text-xs text-muted">{formatPattern(pattern)}</div>
                </div>
              )}

              {stage === "setup" && (
                <div className="flex flex-col items-center gap-3">
                  {trackUrge && (
                    <div className="w-full max-w-xs">
                      <UrgeScale label="Current urge" value={urgeBefore} onChange={setUrgeBefore} />
                    </div>
                  )}
                  <button onClick={() => setTrackUrge((v) => !v)} className="text-xs text-muted hover:text-foreground">
                    {trackUrge ? "Don't track urge this time" : "Track urge before/after"}
                  </button>
                  <button
                    onClick={handleStart}
                    className="rounded-full bg-accent px-8 py-3 text-sm font-semibold text-black hover:opacity-90"
                  >
                    Start
                  </button>
                </div>
              )}

              {stage === "session" && (
                <div className="flex gap-2">
                  {engine.state.isPaused ? (
                    <button
                      onClick={engine.resume}
                      className="rounded-full bg-accent px-6 py-2 text-sm font-semibold text-black hover:opacity-90"
                    >
                      Resume
                    </button>
                  ) : (
                    <button
                      onClick={engine.pause}
                      className="rounded-full border border-border px-6 py-2 text-sm font-medium text-foreground hover:bg-surface-2"
                    >
                      Pause
                    </button>
                  )}
                  <button
                    onClick={handleRestart}
                    className="rounded-full border border-border px-6 py-2 text-sm font-medium text-foreground hover:bg-surface-2"
                  >
                    Restart
                  </button>
                  <button onClick={backToSetup} className="rounded-full border border-border px-6 py-2 text-sm font-medium text-danger hover:bg-danger/10">
                    Stop
                  </button>
                </div>
              )}

              {stage === "rateAfter" && (
                <div className="flex w-full max-w-xs flex-col items-center gap-4">
                  <p className="text-sm text-foreground">How does it feel now?</p>
                  <UrgeScale label="Current urge" value={urgeAfter} onChange={setUrgeAfter} />
                  <button
                    onClick={() => confirmUrgeAfter(urgeAfter ?? 5)}
                    className="rounded-full bg-accent px-6 py-2 text-sm font-semibold text-black hover:opacity-90"
                  >
                    Continue
                  </button>
                </div>
              )}

              {stage === "complete" && (
                <CompletionScreen
                  pattern={pattern}
                  sessionDuration={sessionDuration}
                  cyclesCompleted={completedCycles}
                  urgeBefore={urgeBefore}
                  urgeAfter={urgeAfter}
                  onRepeat={handleStart}
                  onChangePattern={backToSetup}
                  onDone={backToSetup}
                />
              )}
            </>
          )}

          {resetMode === "rhythm" &&
            (rhythmResult ? (
              <div className="flex flex-col items-center gap-4 text-center">
                <span className="text-4xl">🥁</span>
                <h3 className="text-lg font-semibold text-foreground">Rhythm Complete</h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-lg font-semibold text-foreground">{rhythmResult.duration}s</div>
                    <div className="text-xs text-muted">Duration</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-foreground">{rhythmResult.tapCount}</div>
                    <div className="text-xs text-muted">Tap count</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-foreground">{rhythmResult.consistency}%</div>
                    <div className="text-xs text-muted">Consistency</div>
                  </div>
                </div>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => setRhythmResult(null)}
                    className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-black hover:opacity-90"
                  >
                    Repeat
                  </button>
                  <button
                    onClick={() => selectMode("breathe")}
                    className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-2"
                  >
                    Choose Another Reset
                  </button>
                </div>
              </div>
            ) : (
              <RhythmReset onComplete={handleRhythmComplete} />
            ))}

          {resetMode === "ground" &&
            (groundComplete ? (
              <div className="flex flex-col items-center gap-4 text-center">
                <span className="text-4xl">🌊</span>
                <h3 className="text-lg font-semibold text-foreground">Grounding Complete</h3>
                <p className="text-sm text-muted">You noticed 5 things you could see, touch, hear, smell, and taste.</p>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => setGroundComplete(false)}
                    className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-black hover:opacity-90"
                  >
                    Repeat
                  </button>
                  <button
                    onClick={() => selectMode("breathe")}
                    className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-2"
                  >
                    Choose Another Reset
                  </button>
                </div>
              </div>
            ) : (
              <GroundingReset onComplete={handleGroundComplete} />
            ))}
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-border bg-surface p-5">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">Your Current State</h3>
            <div className="flex flex-col gap-2 text-sm">
              <StateRow label="Focus" value={scores.focus} />
              <StateRow label="Recovery" value={scores.recovery} />
              <StateRow label="Tension" value={tension} inverse />
            </div>
            <div className="mt-3 rounded-xl bg-surface-2 p-3 text-xs text-muted">
              Recommended: <span className="text-foreground">Breathing Reset</span>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-5">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">Choose Your Reset</h3>
            <div className="grid grid-cols-3 gap-2">
              {RESET_MODES.map((mode) => (
                <button
                  key={mode.key}
                  onClick={() => selectMode(mode.key)}
                  aria-pressed={resetMode === mode.key}
                  className={clsx(
                    "flex flex-col items-center gap-1 rounded-xl p-3 text-xs font-medium transition-colors",
                    resetMode === mode.key
                      ? "bg-accent/15 text-accent-foreground ring-1 ring-accent/40"
                      : "bg-surface-2 text-foreground hover:bg-border"
                  )}
                >
                  <span className="text-lg">{mode.icon}</span>
                  {mode.label}
                  <span className="text-[10px] font-normal text-muted">{mode.detail}</span>
                </button>
              ))}
            </div>
          </div>

          {resetMode === "breathe" && stage === "setup" && (
            <div className="rounded-2xl border border-border bg-surface p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-muted">Session Length</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {SESSION_DURATION_OPTIONS.map((seconds) => (
                  <button
                    key={seconds}
                    onClick={() => setSessionDuration(seconds)}
                    className={
                      "rounded-full border px-3 py-1.5 text-xs font-medium " +
                      (sessionDuration === seconds
                        ? "border-accent bg-accent/10 text-accent-foreground"
                        : "border-border text-muted hover:text-foreground")
                    }
                  >
                    {seconds}s
                  </button>
                ))}
              </div>
            </div>
          )}

          {resetMode === "breathe" && stage === "setup" && (
            <div className="rounded-2xl border border-border bg-surface p-5">
              <PatternEditor pattern={pattern} onChange={setPattern} />
            </div>
          )}

          {resetMode === "breathe" && stage === "setup" && (
            <div className="rounded-2xl border border-border bg-surface p-5">
              <SavedPatternsPanel currentPattern={pattern} onSelect={setPattern} />
            </div>
          )}

          {resetMode !== "rhythm" && (
            <div className="rounded-2xl border border-border bg-surface p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-muted">Cues</h3>
              </div>
              <div className="flex flex-col gap-2 text-sm text-foreground">
                <label className="flex items-center justify-between">
                  Sound
                  <input type="checkbox" checked={soundEnabled} onChange={(e) => setSoundEnabled(e.target.checked)} />
                </label>
                <label className="flex items-center justify-between">
                  Haptics
                  <input type="checkbox" checked={hapticsEnabled} onChange={(e) => setHapticsEnabled(e.target.checked)} />
                </label>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-border bg-surface p-5">
            <HistoryPanel />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 rounded-2xl border border-border bg-surface p-5 text-center">
        <div>
          <div className="text-xl font-semibold text-foreground">{urgeSurferResetsToday}</div>
          <div className="text-xs text-muted">Resets</div>
        </div>
        <div>
          <div className="text-xl font-semibold text-foreground">{totalMinutesToday}m</div>
          <div className="text-xs text-muted">Total</div>
        </div>
        <div>
          <div className="text-xl font-semibold text-foreground">{streak}</div>
          <div className="text-xs text-muted">Day Streak</div>
        </div>
      </div>

      <ActivityExplorer />
    </div>
  );
}

function StateRow({ label, value, inverse }: { label: string; value: number; inverse?: boolean }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs text-muted">
        <span>{label}</span>
        <span className="text-foreground">{value}</span>
      </div>
      <ProgressBar value={value} tone={inverse ? (value > 60 ? "critical" : "good") : "good"} />
    </div>
  );
}
