"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { OtpStep } from "@/components/auth/OtpStep";
import { TextField } from "@/components/ui/TextField";
import { PasswordField } from "@/components/ui/PasswordField";
import { CurrentUser, useAuthStore } from "@/lib/auth/authStore";
import { authPost } from "@/lib/auth/authApi";
import { isValidEmail } from "@/lib/auth/validation";
import { useIsClient } from "@/lib/useIsClient";

/** Where to go after signing in: the page the user was sent away from, if it's one of ours. */
function nextPath(user: CurrentUser): string {
  if (!user.onboardingComplete) return "/onboarding";
  const next = new URLSearchParams(window.location.search).get("next");
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export default function LoginPage() {
  const router = useRouter();
  const refresh = useAuthStore((s) => s.refresh);
  const setUser = useAuthStore((s) => s.setUser);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const isClient = useIsClient();
  const accountDeleted = isClient && new URLSearchParams(window.location.search).has("deleted");

  // Already signed in (e.g. opened /login in a new tab) → skip the form.
  useEffect(() => {
    refresh().then((user) => {
      if (user) router.replace(nextPath(user));
    });
  }, [refresh, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(undefined);
    if (!isValidEmail(email.trim())) {
      setEmailError("Enter a valid email address");
      return;
    }
    setEmailError(undefined);
    if (!password) {
      setFormError("Enter your password");
      return;
    }

    setLoading(true);
    const result = await authPost<{ challengeId: string }>("/api/auth/login", { email, password });
    setLoading(false);
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    setPassword("");
    setChallengeId(result.data.challengeId);
  }

  if (challengeId) {
    return (
      <AuthLayout>
        <OtpStep<{ user: CurrentUser }>
          email={email.trim().toLowerCase()}
          challengeId={challengeId}
          purpose="login"
          onChallengeChange={setChallengeId}
          onVerified={({ user }) => {
            setUser(user);
            router.replace(nextPath(user));
          }}
          onBack={() => setChallengeId(null)}
        />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        {accountDeleted && (
          <div role="status" className="rounded-lg bg-surface-2 px-3 py-2 text-xs text-foreground">
            Your account and its data have been deleted.
          </div>
        )}
        <TextField
          label="Email Address"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={emailError}
          placeholder="you@example.com"
          required
        />
        <PasswordField
          label="Password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
        />

        {formError && <div className="rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">{formError}</div>}

        <div className="flex items-center justify-between text-xs">
          <Link href="/forgot-password" className="py-1 text-muted hover:text-foreground">
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-2 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {loading ? "Checking…" : "Continue"}
        </button>
        <p className="text-center text-xs text-muted">We&apos;ll email you a one-time code to finish signing in.</p>

        <p className="text-center text-xs text-muted">
          New to togetherfit?{" "}
          <Link href="/signup" className="font-medium text-accent-foreground hover:underline">
            Create Account
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
