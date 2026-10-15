"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import clsx from "clsx";
import { PageHeader } from "@/components/shell/PageHeader";
import { useAuthStore, useCurrentUser } from "@/lib/auth/authStore";
import { useCameraStore } from "@/lib/store/cameraStore";
import { usePreferencesStore } from "@/lib/store/preferencesStore";
import { useIsClient } from "@/lib/useIsClient";
import { AccountDataSection } from "@/components/settings/AccountDataSection";
import { AccountEditor } from "@/components/settings/AccountEditor";
import { MatchingSettings } from "@/components/profile/MatchingSettings";
import { Avatar } from "@/components/profile/Avatar";
import { useMyProfile } from "@/lib/profile/profileStore";

function SettingsSection({ title, id, children }: { title: string; id?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 rounded-2xl border border-border bg-surface p-5">
      <h2 className="mb-4 text-sm font-semibold text-foreground">{title}</h2>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className="flex items-center justify-between gap-4 text-sm text-foreground"
    >
      <span>{label}</span>
      <span
        className={clsx(
          "relative h-6 w-11 rounded-full transition-colors",
          on ? "bg-accent" : "bg-surface-2"
        )}
      >
        <span
          className={clsx(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform",
            on ? "translate-x-5" : "translate-x-0.5"
          )}
        />
      </span>
    </button>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const user = useCurrentUser();
  const logOut = useAuthStore((s) => s.logOut);
  const { theme, setTheme } = useTheme();
  const mounted = useIsClient();

  const { profile } = useMyProfile();
  const permission = useCameraStore((s) => s.permission);
  const monitoring = useCameraStore((s) => s.monitoring);
  const alertsEnabled = useCameraStore((s) => s.alertsEnabled);
  const gazeAlertsEnabled = useCameraStore((s) => s.gazeAlertsEnabled);
  const alertSensitivity = useCameraStore((s) => s.alertSensitivity);
  const alertCooldownMinutes = useCameraStore((s) => s.alertCooldownMinutes);
  const setAlertsEnabled = useCameraStore((s) => s.setAlertsEnabled);
  const setGazeAlertsEnabled = useCameraStore((s) => s.setGazeAlertsEnabled);
  const setAlertSensitivity = useCameraStore((s) => s.setAlertSensitivity);
  const setAlertCooldownMinutes = useCameraStore((s) => s.setAlertCooldownMinutes);

  const wellnessReminders = usePreferencesStore((s) => s.wellnessReminders);
  const setWellnessReminders = usePreferencesStore((s) => s.setWellnessReminders);

  const permissionLabel =
    permission === "granted" ? "Granted" : permission === "denied" ? "Denied" : permission === "unknown" ? "Not yet requested" : "Unavailable";

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <PageHeader icon="nav.settings" title="Settings" subtitle="Account, privacy & safety, notifications, appearance and your data." />

      <SettingsSection title="Account">
        <AccountEditor />
        <Link href="/profile" className="flex items-center gap-3 rounded-xl bg-surface-2 p-3 hover:bg-border">
          <Avatar name={user?.name ?? "?"} photoId={profile?.photoId} verified={!!profile?.verifiedAt} size="sm" />
          <span className="flex-1 text-sm">
            <span className="block text-foreground">My Profile</span>
            <span className="block text-xs text-muted">Photo, verification and your friend code</span>
          </span>
          <span className="text-muted" aria-hidden="true">→</span>
        </Link>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={async () => {
              await logOut();
              router.replace("/login");
            }}
            className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-2"
          >
            Log Out
          </button>
        </div>
      </SettingsSection>

      <SettingsSection title="Privacy & safety" id="privacy">
        <MatchingSettings />
      </SettingsSection>

      <SettingsSection title="Camera">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-surface-2 p-3">
            <div className="text-xs text-muted">Camera Monitoring</div>
            <div className="mt-1 font-medium text-foreground">{monitoring ? "ON" : "OFF"}</div>
          </div>
          <div className="rounded-xl bg-surface-2 p-3">
            <div className="text-xs text-muted">Camera Permission</div>
            <div className="mt-1 font-medium text-foreground">{permissionLabel}</div>
          </div>
          <div className="rounded-xl bg-surface-2 p-3">
            <div className="text-xs text-muted">Processing</div>
            <div className="mt-1 font-medium text-foreground">Local browser processing</div>
          </div>
          <div className="rounded-xl bg-surface-2 p-3">
            <div className="text-xs text-muted">Recording / Cloud Upload</div>
            <div className="mt-1 font-medium text-foreground">Disabled</div>
          </div>
        </div>

        <div className="rounded-xl bg-surface-2 p-3 text-xs text-muted">
          To revoke camera access, togetherfit cannot do this from JavaScript alone — use your browser&apos;s
          site settings: click the lock/camera icon in the address bar (Chrome/Edge) or open
          Settings → Privacy → Camera (Firefox/Safari) and remove access for this site.
        </div>

        <div className="flex flex-col gap-3 border-t border-border pt-3">
          <Toggle on={alertsEnabled} onChange={setAlertsEnabled} label="Posture alerts" />
          <Toggle on={gazeAlertsEnabled} onChange={setGazeAlertsEnabled} label="Gaze / eye-level alerts" />

          <label className="flex items-center justify-between text-sm text-foreground">
            Alert sensitivity
            <select
              value={alertSensitivity}
              onChange={(e) => setAlertSensitivity(e.target.value as "low" | "medium" | "high")}
              className="rounded-lg border border-border bg-surface px-2 py-1 text-sm text-foreground"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </label>

          <label className="flex items-center justify-between text-sm text-foreground">
            Remind again every (minutes)
            <input
              type="number"
              min={1}
              max={15}
              value={alertCooldownMinutes}
              onChange={(e) => setAlertCooldownMinutes(Number(e.target.value))}
              className="w-16 rounded-lg border border-border bg-surface px-2 py-1 text-sm text-foreground"
            />
          </label>
        </div>
      </SettingsSection>

      <SettingsSection title="Notifications">
        <Toggle on={wellnessReminders} onChange={setWellnessReminders} label="Wellness reminders" />
      </SettingsSection>

      <SettingsSection title="Appearance">
        <div className="flex gap-2">
          {(["dark", "light", "system"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setTheme(mode)}
              className={clsx(
                "flex-1 rounded-xl border px-3 py-2 text-sm font-medium capitalize transition-colors",
                mounted && theme === mode
                  ? "border-accent bg-accent/10 text-accent-foreground"
                  : "border-border text-muted hover:text-foreground"
              )}
            >
              {mode}
            </button>
          ))}
        </div>
      </SettingsSection>

      <AccountDataSection />

      <p className="text-center text-xs text-muted">
        <Link href="/privacy" className="hover:text-foreground hover:underline">Privacy Policy</Link>
        {" · "}
        <Link href="/terms" className="hover:text-foreground hover:underline">Terms of Service</Link>
      </p>
    </div>
  );
}
