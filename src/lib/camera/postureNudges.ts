/**
 * Posture and gaze nudges: turns the camera's per-tick readings into
 * occasional, supportive notifications. It consumes the existing
 * FaceLandmarker readings (see postureAnalysis.ts) and never runs its own
 * detector. Deliberately dependency-free so it can be unit-tested in plain Node.
 *
 *   optimal ──non-optimal for the warning duration──▶ warning (notify)
 *   warning ──still non-optimal──▶ remind again every reminder interval until corrected
 *   warning ──back to good──▶ recovering ──good for RECOVERY_DURATION──▶ optimal (reset)
 *   recovering ──non-optimal again──▶ warning (reminders resume on the same schedule)
 *   anything ──no face / low confidence──▶ no-detection (timers cleared, never a warning)
 */

export const NUDGE_CONFIG = {
  /** Matches the existing sustained-slouch rule in usePostureCamera (>10–15 s). */
  POSTURE_WARNING_DURATION_MS: 12_000,
  /** Looking away is noticeable sooner than a slow slouch. */
  GAZE_WARNING_DURATION_MS: 8_000,
  /** The existing "posture alignment restored" rule: good for 2 s counts as corrected. */
  RECOVERY_DURATION_MS: 2_000,
  /** Head rolled sideways this far (ear towards shoulder) counts as non-optimal posture. */
  HEAD_TILT_LIMIT_DEG: 20,
  /** Head turned this far left/right counts as looking away from the screen. */
  GAZE_TURN_LIMIT_DEG: 25,
  /** Low sensitivity waits longer before nudging; high nudges sooner. */
  SENSITIVITY_MULTIPLIER: { low: 1.5, medium: 1, high: 0.6 },
  /** How long a nudge stays on screen, and the window in which posture + gaze are merged. */
  NUDGE_VISIBLE_MS: 8_000,
} as const;

export type NudgeKind = "posture" | "gaze";
export type NudgeState = "no-detection" | "optimal" | "warning" | "recovering";
export type Sensitivity = keyof typeof NUDGE_CONFIG.SENSITIVITY_MULTIPLIER;

export interface ReadingLike {
  postureStatus: "optimal" | "mild" | "elevated-risk";
  headTilt: number;
  headTurn: number;
}

/**
 * Non-optimal checks, built on the existing posture status and angle readings.
 * "Mild" posture (eye level 55–75°) counts, except on Low sensitivity, which
 * only nudges for the more pronounced "elevated-risk" range.
 */
export function classifyReading(r: ReadingLike, sensitivity: Sensitivity = "medium"): { postureBad: boolean; gazeBad: boolean } {
  const postureOff = r.postureStatus === "elevated-risk" || (r.postureStatus === "mild" && sensitivity !== "low");
  return {
    postureBad: postureOff || r.headTilt >= NUDGE_CONFIG.HEAD_TILT_LIMIT_DEG,
    gazeBad: r.headTurn >= NUDGE_CONFIG.GAZE_TURN_LIMIT_DEG,
  };
}

export interface TrackerSettings {
  sensitivity: Sensitivity;
  /** While still non-optimal, remind again after this long (the "Remind again every" setting). */
  cooldownMs: number;
  postureEnabled: boolean;
  gazeEnabled: boolean;
}

export interface NudgeEvent {
  kind: NudgeKind;
  /** warning = an episode started; reminder = still not corrected after the reminder interval. */
  type: "warning" | "reminder" | "recovered";
  /** true when this warning should actually be shown (alerts on, cooldown passed). */
  notify: boolean;
  sustainedMs: number;
}

class SignalTracker {
  state: NudgeState = "no-detection";
  private badSince: number | null = null;
  private goodSince: number | null = null;
  private lastNotifiedAt: number | null = null;

  update(now: number, detected: boolean, bad: boolean, warnMs: number, cooldownMs: number, enabled: boolean, kind: NudgeKind): NudgeEvent | null {
    if (!detected) {
      // Leaving the frame or an unreliable detection is not bad posture: pause, don't accumulate.
      this.state = "no-detection";
      this.badSince = null;
      this.goodSince = null;
      return null;
    }
    if (this.state === "no-detection") this.state = "optimal";

    if (bad) {
      this.goodSince = null;
      if (this.state === "recovering") this.state = "warning"; // same episode continues
      if (this.state === "warning") {
        // Not corrected yet: remind again once the reminder interval has passed.
        const due = this.lastNotifiedAt === null || now - this.lastNotifiedAt >= cooldownMs;
        if (!enabled || !due) return null;
        this.lastNotifiedAt = now;
        return { kind, type: "reminder", notify: true, sustainedMs: this.badSince === null ? 0 : now - this.badSince };
      }
      if (this.badSince === null) this.badSince = now;
      const sustainedMs = now - this.badSince;
      if (sustainedMs < warnMs) return null;
      this.state = "warning";
      const cooled = this.lastNotifiedAt === null || now - this.lastNotifiedAt >= cooldownMs;
      const notify = enabled && cooled;
      if (notify) this.lastNotifiedAt = now;
      return { kind, type: "warning", notify, sustainedMs };
    }

    if (this.state !== "recovering" && this.state !== "warning") this.badSince = null;
    if (this.state === "warning") {
      this.state = "recovering";
      this.goodSince = now;
      return null;
    }
    if (this.state === "recovering" && this.goodSince !== null && now - this.goodSince >= NUDGE_CONFIG.RECOVERY_DURATION_MS) {
      this.state = "optimal";
      this.goodSince = null;
      this.badSince = null;
      return { kind, type: "recovered", notify: false, sustainedMs: 0 };
    }
    return null;
  }

  /** Forget timers (e.g. the tab was hidden); cooldown history is kept. */
  pause() {
    this.state = "no-detection";
    this.badSince = null;
    this.goodSince = null;
  }
}

export class NudgeTracker {
  private posture = new SignalTracker();
  private gaze = new SignalTracker();

  /**
   * Feed one detection tick. `reading` is null when no face was detected.
   * Returns warning/recovered events for this tick (usually none).
   */
  update(now: number, reading: ReadingLike | null, settings: TrackerSettings): NudgeEvent[] {
    const detected = reading !== null;
    const { postureBad, gazeBad } = reading ? classifyReading(reading, settings.sensitivity) : { postureBad: false, gazeBad: false };
    const m = NUDGE_CONFIG.SENSITIVITY_MULTIPLIER[settings.sensitivity] ?? 1;
    const events = [
      this.posture.update(now, detected, postureBad, NUDGE_CONFIG.POSTURE_WARNING_DURATION_MS * m, settings.cooldownMs, settings.postureEnabled, "posture"),
      this.gaze.update(now, detected, gazeBad, NUDGE_CONFIG.GAZE_WARNING_DURATION_MS * m, settings.cooldownMs, settings.gazeEnabled, "gaze"),
    ];
    return events.filter((e): e is NudgeEvent => e !== null);
  }

  pause() {
    this.posture.pause();
    this.gaze.pause();
  }

  get states(): { posture: NudgeState; gaze: NudgeState } {
    return { posture: this.posture.state, gaze: this.gaze.state };
  }
}

/** Copy for each nudge. Supportive, short, and no medical claims. */
export const NUDGE_MESSAGES: Record<NudgeKind | "both", { title: string; body: string }> = {
  posture: { title: "🧘 Your posture needs a little adjustment", body: "Sit back and keep your shoulders relaxed." },
  gaze: { title: "👀 Check your gaze", body: "Try looking straight at your screen for better alignment." },
  both: { title: "Quick reset 👀", body: "Sit back, relax your shoulders, and bring your gaze back to the screen." },
};
