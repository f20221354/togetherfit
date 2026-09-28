"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { primeAudio } from "@/lib/breathing/audio";

const SESSION_DURATION = 90;
const TOLERANCE_MS = 180;

function playTick(ctxRef: React.RefObject<AudioContext | null>) {
  const ctx = ctxRef.current;
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const now = ctx.currentTime;
  osc.type = "sine";
  osc.frequency.setValueAtTime(520, now);
  gain.gain.setValueAtTime(0.05, now);
  gain.gain.linearRampToValueAtTime(0, now + 0.08);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.1);
}

export function RhythmReset({ onComplete }: { onComplete: (stats: { duration: number; tapCount: number; consistency: number }) => void }) {
  const [bpm, setBpm] = useState(60);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [running, setRunning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(SESSION_DURATION);
  const [tapCount, setTapCount] = useState(0);
  const [pulse, setPulse] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const beatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastBeatAtRef = useRef<number>(0);
  const tapCountRef = useRef(0);
  const onBeatCountRef = useRef(0);
  const elapsedRef = useRef(0);

  useEffect(() => {
    return () => {
      if (beatIntervalRef.current) clearInterval(beatIntervalRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  function start() {
    primeAudio();
    if (!audioCtxRef.current && typeof window !== "undefined") {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Ctor) audioCtxRef.current = new Ctor();
    }
    audioCtxRef.current?.resume().catch(() => {});

    tapCountRef.current = 0;
    onBeatCountRef.current = 0;
    elapsedRef.current = 0;
    setTapCount(0);
    setSecondsLeft(SESSION_DURATION);
    setRunning(true);

    const intervalMs = 60000 / bpm;
    lastBeatAtRef.current = performance.now();
    beatIntervalRef.current = setInterval(() => {
      lastBeatAtRef.current = performance.now();
      setPulse(true);
      setTimeout(() => setPulse(false), 120);
      if (soundEnabled) playTick(audioCtxRef);
      if (hapticsEnabled && typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(30);
    }, intervalMs);

    countdownRef.current = setInterval(() => {
      elapsedRef.current += 1;
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          finish();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function finish() {
    if (beatIntervalRef.current) clearInterval(beatIntervalRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    setRunning(false);
    const consistency = tapCountRef.current > 0 ? Math.round((onBeatCountRef.current / tapCountRef.current) * 100) : 0;
    onComplete({ duration: elapsedRef.current, tapCount: tapCountRef.current, consistency });
  }

  function handleTap() {
    if (!running) return;
    tapCountRef.current += 1;
    setTapCount(tapCountRef.current);
    const delta = Math.abs(performance.now() - lastBeatAtRef.current);
    if (delta <= TOLERANCE_MS) {
      onBeatCountRef.current += 1;
    }
  }

  const progress = ((SESSION_DURATION - secondsLeft) / SESSION_DURATION) * 100;

  return (
    <div className="flex flex-col items-center gap-5">
      <motion.button
        onClick={handleTap}
        animate={{ scale: pulse ? 1.12 : 1 }}
        transition={{ duration: 0.15 }}
        className="flex h-48 w-48 items-center justify-center rounded-full bg-gradient-to-br from-accent/30 to-accent/5 text-lg font-semibold text-accent-foreground"
        style={{ boxShadow: pulse ? "0 0 40px -5px var(--accent)" : "none" }}
      >
        {running ? "TAP" : "Ready"}
      </motion.button>

      {running ? (
        <>
          <div className="text-sm text-muted">{secondsLeft}s left · {tapCount} taps</div>
          <div className="w-full max-w-xs">
            <div className="h-2 w-full rounded-full bg-surface-2">
              <div className="h-2 rounded-full bg-accent transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <button
            onClick={finish}
            className="rounded-full border border-border px-6 py-2 text-sm font-medium text-foreground hover:bg-surface-2"
          >
            Stop
          </button>
        </>
      ) : (
        <>
          <div className="flex items-center gap-3 text-sm text-foreground">
            <button
              onClick={() => setBpm((b) => Math.max(40, b - 5))}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-border hover:bg-surface-2"
            >
              −
            </button>
            <span className="w-20 text-center">{bpm} BPM</span>
            <button
              onClick={() => setBpm((b) => Math.min(140, b + 5))}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-border hover:bg-surface-2"
            >
              +
            </button>
          </div>
          <div className="flex gap-4 text-xs text-foreground">
            <label className="flex items-center gap-1.5">
              <input type="checkbox" checked={soundEnabled} onChange={(e) => setSoundEnabled(e.target.checked)} />
              Sound
            </label>
            <label className="flex items-center gap-1.5">
              <input type="checkbox" checked={hapticsEnabled} onChange={(e) => setHapticsEnabled(e.target.checked)} />
              Haptics
            </label>
          </div>
          <button onClick={start} className="rounded-full bg-accent px-8 py-3 text-sm font-semibold text-black hover:opacity-90">
            Start Rhythm
          </button>
        </>
      )}
    </div>
  );
}
