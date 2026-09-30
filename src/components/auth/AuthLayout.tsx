import { TogetherfitLogo } from "@/components/brand/TogetherfitLogo";
export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <h1 className="sr-only">Welcome to togetherfit</h1>
          <TogetherfitLogo size={150} />
          <p className="max-w-xs text-sm text-muted">
            Your wellness companion for posture, focus, movement and recovery.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">{children}</div>
      </div>
    </div>
  );
}
