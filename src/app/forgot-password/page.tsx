"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { TextField } from "@/components/ui/TextField";
import { PasswordField } from "@/components/ui/PasswordField";
import { CurrentUser, useAuthStore } from "@/lib/auth/authStore";
import { authPost } from "@/lib/auth/authApi";
import { Captcha, captchaRequired } from "@/components/auth/Captcha";
import { checkPassword, isValidEmail } from "@/lib/auth/validation";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);

  const [email, setEmail] = useState("");
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [notice, setNotice] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaReset, setCaptchaReset] = useState(0);

  async function requestCode(e: FormEvent) {
    e.preventDefault();
    if (!isValidEmail(email.trim())) {
      setError("Enter a valid email address");
      return;
    }
    if (captchaRequired && !captchaToken) {
      setError("Please complete the quick check below first.");
      return;
    }
    setError(undefined);
    setLoading(true);
    const result = await authPost<{ challengeId: string }>("/api/auth/forgot", { email, captchaToken });
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      setCaptchaReset((n) => n + 1);
      return;
    }
    setChallengeId(result.data.challengeId);
  }

  async function resend() {
    if (!challengeId) return;
    setError(undefined);
    const result = await authPost<{ challengeId: string }>("/api/auth/resend", { challengeId });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setChallengeId(result.data.challengeId);
    setNotice("A new code is on its way.");
  }

  async function reset(e: FormEvent) {
    e.preventDefault();
    setNotice(undefined);
    if (!/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit code from the email");
      return;
    }
    const passwordCheck = checkPassword(password);
    if (!passwordCheck.valid) {
      setError(passwordCheck.message);
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setError(undefined);
    setLoading(true);
    const result = await authPost<{ user: CurrentUser }>("/api/auth/reset", { challengeId, code, password });
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setUser(result.data.user);
    router.replace(result.data.user.onboardingComplete ? "/" : "/onboarding");
  }

  return (
    <AuthLayout>
      {challengeId ? (
        <form onSubmit={reset} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1 text-center">
            <h2 className="text-base font-semibold text-foreground">Check your email</h2>
            <p className="text-sm text-muted">
              If an account exists for <strong className="break-all text-foreground">{email.trim()}</strong>, we sent it a
              6-digit code. It expires in 10 minutes.
            </p>
          </div>
          <TextField
            label="Code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
          />
          <PasswordField
            label="New Password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            hint="At least 8 characters, with a letter and a number"
          />
          <PasswordField
            label="Confirm New Password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          {error && <div className="rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">{error}</div>}
          {notice && !error && <div className="rounded-lg bg-success/10 px-3 py-2 text-xs text-success">{notice}</div>}
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {loading ? "Saving…" : "Reset Password"}
          </button>
          <div className="flex items-center justify-between text-xs">
            <button type="button" onClick={() => setChallengeId(null)} className="text-muted hover:text-foreground">
              ← Different email
            </button>
            <button type="button" onClick={resend} className="font-medium text-accent-foreground hover:underline">
              Resend code
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={requestCode} className="flex flex-col gap-4" noValidate>
          <p className="text-sm text-muted">Enter your email and we&apos;ll send you a code to reset your password.</p>
          <TextField
            label="Email Address"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={error}
            placeholder="you@example.com"
          />
          <Captcha onToken={setCaptchaToken} resetKey={captchaReset} />
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {loading ? "Sending…" : "Send Code"}
          </button>
          <p className="text-center text-xs text-muted">
            <Link href="/login" className="font-medium text-accent-foreground hover:underline">
              Back to Log In
            </Link>
          </p>
        </form>
      )}
    </AuthLayout>
  );
}
