"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore, useAuthHydrated } from "@/lib/auth/authStore";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const currentUserEmail = useAuthStore((s) => s.currentUserEmail);
  const onboardingComplete = useAuthStore((s) => s.onboardingComplete);
  const hydrated = useAuthHydrated();

  useEffect(() => {
    if (!hydrated) return;
    if (!currentUserEmail) {
      router.replace("/login");
      return;
    }
    if (!onboardingComplete[currentUserEmail]) {
      router.replace("/onboarding");
    }
  }, [hydrated, currentUserEmail, onboardingComplete, router]);

  if (!hydrated || !currentUserEmail || !onboardingComplete[currentUserEmail]) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted">
        Loading स्वस्थ Bharat…
      </div>
    );
  }

  return <>{children}</>;
}
