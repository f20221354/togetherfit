"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore, useCurrentUser } from "@/lib/auth/authStore";
import { clearStorageForUser, exportUserScopedData } from "@/lib/store/userScopedStorage";
import { PasswordField } from "@/components/ui/PasswordField";

function downloadJson(filename: string, data: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** "Download my data" and "Delete account" (DPDP Act rights to access and erasure). */
export function AccountDataSection() {
  const router = useRouter();
  const user = useCurrentUser();
  const setUser = useAuthStore((s) => s.setUser);

  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function exportData() {
    setExporting(true);
    setExportError(null);
    try {
      const res = await fetch("/api/account/export", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error);
      downloadJson(`togetherfit-data-${new Date().toISOString().slice(0, 10)}.json`, {
        ...json.data,
        // This browser's copy too, in case it has changes not yet saved to the server.
        thisBrowser: exportUserScopedData(),
      });
    } catch (err) {
      setExportError((err as Error).message || "Couldn't export your data. Please try again.");
    } finally {
      setExporting(false);
    }
  }

  async function deleteAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!user || deleting) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setDeleteError(json.error ?? "Couldn't delete your account. Please try again.");
        return;
      }
      setUser(null);
      clearStorageForUser(user.id);
      router.replace("/login?deleted=1");
    } catch {
      setDeleteError("Can't reach togetherfit. Check your connection and try again.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <h2 className="mb-4 text-sm font-semibold text-foreground">Your Data</h2>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 text-sm">
          <p className="text-muted">
            Download a copy of everything togetherfit stores about you: your account, friends, messages, searches,
            groups, activities and milestones, workouts, wellness and goals, and your settings.
          </p>
          <div>
            <button
              onClick={exportData}
              disabled={exporting}
              className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-2 disabled:opacity-60"
            >
              {exporting ? "Preparing…" : "Download my data"}
            </button>
          </div>
          {exportError && <p className="text-xs text-danger">{exportError}</p>}
        </div>

        <div className="flex flex-col gap-2 border-t border-border pt-4 text-sm">
          <p className="text-muted">
            Deleting your account permanently removes your profile, friends, messages, searches, groups you created,
            activities and milestones. This can&apos;t be undone.
          </p>
          {!confirming ? (
            <div>
              <button
                onClick={() => setConfirming(true)}
                className="rounded-full border border-danger/50 px-4 py-2 text-sm font-medium text-danger hover:bg-danger/10"
              >
                Delete account
              </button>
            </div>
          ) : (
            <form onSubmit={deleteAccount} className="flex flex-col gap-3 rounded-xl border border-danger/40 bg-danger/5 p-4">
              <PasswordField
                label="Enter your password to confirm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                autoFocus
              />
              {deleteError && <p className="text-xs text-danger">{deleteError}</p>}
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={!password || deleting}
                  className="rounded-full bg-danger px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                >
                  {deleting ? "Deleting…" : "Permanently delete my account"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConfirming(false);
                    setPassword("");
                    setDeleteError(null);
                  }}
                  className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-2"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
