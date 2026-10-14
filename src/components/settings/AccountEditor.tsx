"use client";

import { useState } from "react";
import { useAuthStore, useCurrentUser } from "@/lib/auth/authStore";
import { TextField } from "@/components/ui/TextField";
import { PasswordField } from "@/components/ui/PasswordField";
import { checkPassword } from "@/lib/auth/validation";

type Editing = null | "name" | "email" | "password";

async function post(url: string, body: unknown): Promise<{ ok: boolean; error?: string; [k: string]: unknown }> {
  try {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    return await res.json().catch(() => ({ ok: false, error: "Something went wrong. Please try again." }));
  } catch {
    return { ok: false, error: "Can't reach togetherfit. Check your connection." };
  }
}

function Row({ label, value, action, onAction }: { label: string; value: string; action: string; onAction: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <div className="min-w-0">
        <div className="text-muted">{label}</div>
        <div className="break-all text-foreground">{value}</div>
      </div>
      <button onClick={onAction} className="shrink-0 rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground hover:bg-surface-2">
        {action}
      </button>
    </div>
  );
}

const box = "flex flex-col gap-3 rounded-xl border border-border bg-surface-2 p-4";
const primary = "rounded-full bg-accent px-4 py-2 text-xs font-semibold text-black hover:opacity-90 disabled:opacity-60";
const secondary = "rounded-full border border-border px-4 py-2 text-xs text-foreground hover:bg-surface";

/** Settings → Account: change name, email (verified with a code to the new address) and password. */
export function AccountEditor() {
  const user = useCurrentUser();
  const refresh = useAuthStore((s) => s.refresh);
  const [editing, setEditing] = useState<Editing>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  if (!user) return null;

  function open(which: Editing) {
    setEditing(which);
    setError(null);
    setNotice(null);
    setName(user?.name ?? "");
    setNewEmail("");
    setEmailPassword("");
    setChallengeId(null);
    setCode("");
    setCurrentPassword("");
    setNewPassword("");
  }

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    await fn();
    setBusy(false);
  }

  const saveName = () =>
    run(async () => {
      const r = await post("/api/account/name", { name });
      if (!r.ok) return setError(r.error ?? "Couldn't save.");
      await refresh();
      setEditing(null);
      setNotice("Name updated.");
    });

  const startEmail = () =>
    run(async () => {
      const r = await post("/api/account/email/start", { newEmail, password: emailPassword });
      if (!r.ok) return setError(r.error ?? "Couldn't send the code.");
      setChallengeId(r.challengeId as string);
    });

  const verifyEmail = () =>
    run(async () => {
      const r = await post("/api/account/email/verify", { challengeId, code });
      if (!r.ok) return setError(r.error ?? "That code didn't work.");
      await refresh();
      setEditing(null);
      setNotice(`Your email is now ${r.email as string}. We let your old address know.`);
    });

  const savePassword = () =>
    run(async () => {
      const check = checkPassword(newPassword);
      if (!check.valid) return setError(check.message ?? "Choose a stronger password.");
      const r = await post("/api/account/password", { currentPassword, newPassword });
      if (!r.ok) return setError(r.error ?? "Couldn't change your password.");
      setEditing(null);
      setNotice("Password changed. You've been signed out on your other devices.");
    });

  return (
    <div className="flex flex-col gap-4">
      {editing === "name" ? (
        <div className={box}>
          <TextField label="Name" id="account-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoComplete="name" />
          <p className="text-xs text-muted">This is how friends see you.</p>
          {error && <p className="text-xs text-danger">{error}</p>}
          <div className="flex gap-2">
            <button onClick={saveName} disabled={busy} className={primary}>{busy ? "Saving…" : "Save"}</button>
            <button onClick={() => setEditing(null)} className={secondary}>Cancel</button>
          </div>
        </div>
      ) : (
        <Row label="Name" value={user.name} action="Edit" onAction={() => open("name")} />
      )}

      {editing === "email" ? (
        <div className={box}>
          {!challengeId ? (
            <>
              <TextField label="New email address" id="account-new-email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} autoComplete="email" />
              <PasswordField label="Your password" id="account-email-password" value={emailPassword} onChange={(e) => setEmailPassword(e.target.value)} autoComplete="current-password" />
              <p className="text-xs text-muted">We&apos;ll send a code to the new address. Your email doesn&apos;t change until you enter it.</p>
              {error && <p className="text-xs text-danger">{error}</p>}
              <div className="flex gap-2">
                <button onClick={startEmail} disabled={busy || !newEmail || !emailPassword} className={primary}>{busy ? "Sending…" : "Send code"}</button>
                <button onClick={() => setEditing(null)} className={secondary}>Cancel</button>
              </div>
            </>
          ) : (
            <>
              <TextField
                label={`Code sent to ${newEmail}`}
                id="account-email-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              />
              {error && <p className="text-xs text-danger">{error}</p>}
              <div className="flex gap-2">
                <button onClick={verifyEmail} disabled={busy || code.length !== 6} className={primary}>{busy ? "Checking…" : "Confirm"}</button>
                <button onClick={() => setEditing(null)} className={secondary}>Cancel</button>
              </div>
            </>
          )}
        </div>
      ) : (
        <Row label="Email" value={user.email} action="Change" onAction={() => open("email")} />
      )}

      {editing === "password" ? (
        <div className={box}>
          <PasswordField label="Current password" id="account-current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} autoComplete="current-password" />
          <PasswordField
            label="New password"
            id="account-new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            hint="At least 8 characters, with a letter and a number"
          />
          <p className="text-xs text-muted">You&apos;ll stay signed in here and be signed out everywhere else.</p>
          {error && <p className="text-xs text-danger">{error}</p>}
          <div className="flex gap-2">
            <button onClick={savePassword} disabled={busy || !currentPassword || !newPassword} className={primary}>{busy ? "Saving…" : "Change password"}</button>
            <button onClick={() => setEditing(null)} className={secondary}>Cancel</button>
          </div>
        </div>
      ) : (
        <Row label="Password" value="••••••••" action="Change" onAction={() => open("password")} />
      )}

      {notice && <p role="status" className="text-xs text-accent-foreground">{notice}</p>}
    </div>
  );
}
