"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { TextField } from "@/components/ui/TextField";
import { PasswordField } from "@/components/ui/PasswordField";
import { useAuthStore } from "@/lib/auth/authStore";
import { isValidEmail } from "@/lib/auth/validation";

export default function LoginPage() {
  const router = useRouter();
  const logIn = useAuthStore((s) => s.logIn);
  const currentUserEmail = useAuthStore((s) => s.currentUserEmail);
  const onboardingComplete = useAuthStore((s) => s.onboardingComplete);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (currentUserEmail) {
      router.replace(onboardingComplete[currentUserEmail] ? "/" : "/onboarding");
    }
  }, [currentUserEmail, onboardingComplete, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(undefined);

    if (!isValidEmail(email)) {
      setEmailError("Enter a valid email address");
      return;
    }
    setEmailError(undefined);

    setLoading(true);
    const result = await logIn(email, password);
    setLoading(false);

    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    setSuccess(true);
    router.push("/");
  }

  return (
    <AuthLayout>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
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

        {formError && (
          <div className="rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">{formError}</div>
        )}
        {success && (
          <div className="rounded-lg bg-success/10 px-3 py-2 text-xs text-success">
            Signed in — taking you to VitaOS…
          </div>
        )}

        <div className="flex items-center justify-between text-xs">
          <Link href="/forgot-password" className="text-muted hover:text-foreground">
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {loading ? "Signing in…" : "Log In"}
        </button>

        <p className="text-center text-xs text-muted">
          New to VitaOS?{" "}
          <Link href="/signup" className="font-medium text-accent-foreground hover:underline">
            Create Account
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
