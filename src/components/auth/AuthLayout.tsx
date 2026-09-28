export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/15 text-2xl text-accent-foreground">
            ◈
          </span>
          <h1 className="text-2xl font-semibold text-foreground">Welcome to VitaOS</h1>
          <p className="max-w-xs text-sm text-muted">
            Your personal wellness operating system for posture, focus, movement and recovery.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">{children}</div>
      </div>
    </div>
  );
}
