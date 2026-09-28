"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAnimationFrame, useMotionValue } from "framer-motion";
import { BreathingPattern, BreathingPhase, PHASE_ORDER, cycleLength } from "./types";

export const CONTRACTED_SCALE = 0.56;
export const EXPANDED_SCALE = 1;

export interface BreathingDisplayState {
  phase: BreathingPhase;
  phaseElapsed: number; // whole seconds
  phaseRemaining: number; // whole seconds
  phaseDuration: number;
  sessionElapsed: number;
  sessionRemaining: number;
  cycle: number; // current 1-indexed cycle in progress
  cyclesCompleted: number; // full cycles finished
  progress: number; // 0-1 overall session progress
  isRunning: boolean;
  isPaused: boolean;
  isComplete: boolean;
}

function easeInOutSine(t: number): number {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

function initialState(pattern: BreathingPattern, sessionDuration: number): BreathingDisplayState {
  return {
    phase: "inhale",
    phaseElapsed: 0,
    phaseRemaining: pattern.inhale,
    phaseDuration: pattern.inhale,
    sessionElapsed: 0,
    sessionRemaining: sessionDuration,
    cycle: 1,
    cyclesCompleted: 0,
    progress: 0,
    isRunning: false,
    isPaused: false,
    isComplete: false,
  };
}

/**
 * The single source of truth for a breathing session: one clock (this
 * animation-frame loop) computes phase, countdown, cycle count, overall
 * progress, and the continuous scale motion value together, every frame.
 * Nothing else times the session independently, so the countdown and the
 * circle animation can never drift apart.
 */
export function useBreathingEngine(
  pattern: BreathingPattern,
  sessionDuration: number,
  onPhaseChange?: (phase: BreathingPhase) => void,
  onComplete?: (cyclesCompleted: number) => void
) {
  const [state, setState] = useState<BreathingDisplayState>(() => initialState(pattern, sessionDuration));
  const scale = useMotionValue(CONTRACTED_SCALE);

  const runningRef = useRef(false);
  const pausedRef = useRef(false);
  const startedAtRef = useRef(0);
  const pausedAtRef = useRef(0);
  const pausedTotalRef = useRef(0);
  const lastSignatureRef = useRef("");
  const lastPhaseRef = useRef<BreathingPhase>("inhale");

  const patternRef = useRef(pattern);
  const sessionDurationRef = useRef(sessionDuration);
  useEffect(() => {
    patternRef.current = pattern;
    sessionDurationRef.current = sessionDuration;
  }, [pattern, sessionDuration]);

  useAnimationFrame(() => {
    if (!runningRef.current || pausedRef.current) return;

    const p = patternRef.current;
    const totalSession = sessionDurationRef.current;
    const len = cycleLength(p);
    if (len <= 0) return;

    const now = performance.now();
    let elapsedSec = (now - startedAtRef.current - pausedTotalRef.current) / 1000;
    const complete = elapsedSec >= totalSession;
    if (complete) elapsedSec = totalSession;

    const cyclesCompleted = Math.min(Math.floor(elapsedSec / len), Math.floor(totalSession / len));
    const posInCycle = complete ? len : elapsedSec % len;

    let phase: BreathingPhase = "inhale";
    let phaseElapsedRaw = posInCycle;
    let acc = 0;
    for (const candidate of PHASE_ORDER) {
      const duration = p[candidate];
      if (duration <= 0) continue;
      if (posInCycle < acc + duration || candidate === PHASE_ORDER[PHASE_ORDER.length - 1]) {
        phase = candidate;
        phaseElapsedRaw = Math.min(posInCycle - acc, duration);
        break;
      }
      acc += duration;
    }
    const phaseDur = Math.max(p[phase], 0.001);
    const phaseProgress = complete ? 1 : Math.min(phaseElapsedRaw / phaseDur, 1);

    // Drive the visual every frame without causing a React re-render.
    if (phase === "inhale") {
      scale.set(CONTRACTED_SCALE + (EXPANDED_SCALE - CONTRACTED_SCALE) * easeInOutSine(phaseProgress));
    } else if (phase === "exhale") {
      scale.set(EXPANDED_SCALE - (EXPANDED_SCALE - CONTRACTED_SCALE) * easeInOutSine(phaseProgress));
    } else if (phase === "holdAfterInhale") {
      scale.set(EXPANDED_SCALE);
    } else {
      scale.set(CONTRACTED_SCALE);
    }

    if (phase !== lastPhaseRef.current) {
      lastPhaseRef.current = phase;
      onPhaseChange?.(phase);
    }

    const phaseElapsedInt = Math.floor(phaseElapsedRaw);
    const phaseRemainingInt = Math.max(Math.ceil(phaseDur - phaseElapsedRaw), 0);
    const sessionElapsedInt = Math.floor(elapsedSec);
    const sessionRemainingInt = Math.max(Math.ceil(totalSession - elapsedSec), 0);

    const signature = `${phase}|${phaseRemainingInt}|${sessionRemainingInt}|${cyclesCompleted}|${complete}`;
    if (signature !== lastSignatureRef.current) {
      lastSignatureRef.current = signature;
      setState({
        phase,
        phaseElapsed: phaseElapsedInt,
        phaseRemaining: phaseRemainingInt,
        phaseDuration: Math.round(phaseDur),
        sessionElapsed: sessionElapsedInt,
        sessionRemaining: sessionRemainingInt,
        cycle: cyclesCompleted + 1,
        cyclesCompleted,
        progress: Math.min(elapsedSec / totalSession, 1),
        isRunning: !complete,
        isPaused: false,
        isComplete: complete,
      });
    }

    if (complete) {
      runningRef.current = false;
      onComplete?.(cyclesCompleted);
    }
  });

  const start = useCallback(() => {
    startedAtRef.current = performance.now();
    pausedTotalRef.current = 0;
    lastPhaseRef.current = "inhale";
    lastSignatureRef.current = "";
    runningRef.current = true;
    pausedRef.current = false;
    scale.set(CONTRACTED_SCALE);
    setState((s) => ({ ...s, isRunning: true, isPaused: false, isComplete: false }));
  }, [scale]);

  const pause = useCallback(() => {
    if (!runningRef.current || pausedRef.current) return;
    pausedRef.current = true;
    pausedAtRef.current = performance.now();
    setState((s) => ({ ...s, isPaused: true }));
  }, []);

  const resume = useCallback(() => {
    if (!pausedRef.current) return;
    pausedTotalRef.current += performance.now() - pausedAtRef.current;
    pausedRef.current = false;
    setState((s) => ({ ...s, isPaused: false }));
  }, []);

  const restart = useCallback(() => {
    start();
  }, [start]);

  const stop = useCallback(() => {
    runningRef.current = false;
    pausedRef.current = false;
    setState(initialState(patternRef.current, sessionDurationRef.current));
    scale.set(CONTRACTED_SCALE);
  }, [scale]);

  return { state, scale, start, pause, resume, restart, stop };
}
