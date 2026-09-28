"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { TextField } from "@/components/ui/TextField";
import { PasswordField } from "@/components/ui/PasswordField";
import { useAuthStore } from "@/lib/auth/authStore";
import { isValidEmail, checkPassword } from "@/lib/auth/validation";

interface FieldErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export default function SignupPage() {
  const router = useRouter();
  const signUp = useAuthStore((s) => s.signUp);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(undefined);

    const nextErrors: FieldErrors = {};
    if (name.trim().length < 2) nextErrors.name = "Enter your name";
    if (!isValidEmail(email)) nextErrors.email = "Enter a valid email address";
    const passwordCheck = checkPassword(password);
    if (!passwordCheck.valid) nextErrors.password = passwordCheck.message;
    if (confirmPassword !== password) nextErrors.confirmPassword = "Passwords do not match";

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    const result = await signUp(name.trim(), email, password);
    setLoading(false);

    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    setSuccess(true);
    router.push("/onboarding");
  }

  return (
    <AuthLayout>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <TextField
          label="Name"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
          placeholder="Ada Lovelace"
          required
        />
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          placeholder="you@example.com"
          required
        />
        <PasswordField
          label="Password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          hint="At least 8 characters, with a letter and a number"
          placeholder="••••••••"
          required
        />
        <PasswordField
          label="Confirm Password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={errors.confirmPassword}
          placeholder="••••••••"
          required
        />

        {formError && (
          <div className="rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">{formError}</div>
        )}
        {success && (
          <div className="rounded-lg bg-success/10 px-3 py-2 text-xs text-success">
            Account created — let&apos;s get you set up…
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {loading ? "Creating account…" : "Create Account"}
        </button>

        <p className="text-center text-xs text-muted">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-accent-foreground hover:underline">
            Log In
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
