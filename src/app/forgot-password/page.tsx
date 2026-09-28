"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { TextField } from "@/components/ui/TextField";
import { isValidEmail } from "@/lib/auth/validation";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [sent, setSent] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isValidEmail(email)) {
      setError("Enter a valid email address");
      return;
    }
    setError(undefined);
    setSent(true);
  }

  return (
    <AuthLayout>
      {sent ? (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <span className="text-3xl">✓</span>
          <p className="text-sm text-foreground">
            If an account exists for <strong>{email}</strong>, a reset link has been sent.
          </p>
          <Link href="/login" className="text-xs font-medium text-accent-foreground hover:underline">
            Back to Log In
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <p className="text-sm text-muted">
            Enter your email and we&apos;ll send you a link to reset your password.
          </p>
          <TextField
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={error}
            placeholder="you@example.com"
            required
          />
          <button
            type="submit"
            className="mt-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-black hover:opacity-90"
          >
            Send Reset Link
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
