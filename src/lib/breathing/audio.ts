import { BreathingPhase } from "./types";

let ctx: AudioContext | null = null;

/** Must be called from a user gesture (e.g. the Start button) to respect autoplay restrictions. */
export function primeAudio() {
  if (typeof window === "undefined") return;
  if (!ctx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (Ctor) ctx = new Ctor();
  }
  ctx?.resume().catch(() => {});
}

function tone(freqStart: number, freqEnd: number, durationMs: number, gainPeak = 0.05) {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  const now = ctx.currentTime;
  osc.frequency.setValueAtTime(freqStart, now);
  osc.frequency.linearRampToValueAtTime(freqEnd, now + durationMs / 1000);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(gainPeak, now + 0.05);
  gain.gain.linearRampToValueAtTime(0, now + durationMs / 1000);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + durationMs / 1000 + 0.05);
}

export function playPhaseCue(phase: BreathingPhase) {
  if (!ctx) return;
  switch (phase) {
    case "inhale":
      tone(280, 420, 500);
      break;
    case "exhale":
      tone(420, 280, 500);
      break;
    case "holdAfterInhale":
    case "holdAfterExhale":
      tone(360, 360, 180, 0.03);
      break;
  }
}

export function vibrate(pattern: number | number[]) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
}
