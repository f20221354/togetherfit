"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth/authStore";
import { PageSkeleton } from "@/components/ui/Skeleton";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const loaded = useAuthStore((s) => s.loaded);
  const refresh = useAuthStore((s) => s.refresh);

  useEffect(() => {
    if (!loaded) refresh();
  }, [loaded, refresh]);

  useEffect(() => {
    if (!loaded) return;
    if (!user) router.replace("/login");
    else if (!user.onboardingComplete) router.replace("/onboarding");
  }, [loaded, user, router]);

  if (!loaded || !user || !user.onboardingComplete) {
    return (
      <div className="flex min-h-dvh items-start justify-center bg-background px-4 pt-20">
        <PageSkeleton />
      </div>
    );
  }

  return <>{children}</>;
}
