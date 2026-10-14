"use client";

import { FormEvent, useEffect, useState } from "react";
import { authPost } from "@/lib/auth/authApi";

const RESEND_COOLDOWN_SECONDS = 30;

/**
 * "We emailed you a code" step shared by signup and login. Calls
 * /api/auth/verify and hands the signed-in user back via onVerified.
 */
export function OtpStep<T>({
  email,
  challengeId,
  purpose,
  onChallengeChange,
  onVerified,
  onBack,
}: {
  email: string;
  challengeId: string;
  purpose: "signup" | "login";
  onChallengeChange: (id: string) => void;
  onVerified: (data: T) => void;
  onBack: () => void;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [notice, setNotice] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function verify(e: FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit code from the email");
      return;
    }
    setLoading(true);
    setError(undefined);
    const result = await authPost<T>("/api/auth/verify", { challengeId, code, purpose });
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onVerified(result.data);
  }

  async function resend() {
    setError(undefined);
    setNotice(undefined);
    const result = await authPost<{ challengeId: string }>("/api/auth/resend", { challengeId });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onChallengeChange(result.data.challengeId);
    setCode("");
    setCooldown(RESEND_COOLDOWN_SECONDS);
    setNotice("A new code is on its way.");
  }

  return (
    <form onSubmit={verify} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1 text-center">
        <h2 className="text-base font-semibold text-foreground">Check your email</h2>
        <p className="text-sm text-muted">
          We sent a 6-digit code to <strong className="break-all text-foreground">{email}</strong>. It expires in 10 minutes.
        </p>
      </div>

      <label className="sr-only" htmlFor="otp-code">
        Verification code
      </label>
      <input
        id="otp-code"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
        inputMode="numeric"
        autoComplete="one-time-code"
        autoFocus
        placeholder="••••••"
        className="rounded-xl border border-border bg-surface-2 px-4 py-3 text-center text-2xl font-semibold tracking-[0.5em] text-foreground outline-none focus:border-accent"
      />

      {error && <div className="rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">{error}</div>}
      {notice && !error && <div className="rounded-lg bg-success/10 px-3 py-2 text-xs text-success">{notice}</div>}

      <button
        type="submit"
        disabled={loading || code.length !== 6}
        className="rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {loading ? "Verifying…" : "Verify"}
      </button>

      <div className="flex items-center justify-between text-xs">
        <button type="button" onClick={onBack} className="text-muted hover:text-foreground">
          ← Use a different email
        </button>
        <button
          type="button"
          onClick={resend}
          disabled={cooldown > 0}
          className="font-medium text-accent-foreground hover:underline disabled:cursor-not-allowed disabled:text-muted disabled:no-underline"
        >
          {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
        </button>
      </div>
    </form>
  );
}
