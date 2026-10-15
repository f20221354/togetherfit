import Link from "next/link";

/** Shared layout for not-found and error screens: a short title, one line of help, and a way back. */
export function StatusScreen({
  code,
  title,
  message,
  action,
}: {
  code: string;
  title: string;
  message: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <div className="font-mono text-xs font-medium uppercase tracking-widest text-muted">{code}</div>
      <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
      <p className="max-w-sm text-sm text-muted">{message}</p>
      <div className="flex flex-wrap justify-center gap-2">
        {action}
        <Link href="/" className="rounded-full border border-border px-5 py-2 text-sm font-medium text-foreground hover:bg-surface-2">
          Go to Home
        </Link>
      </div>
    </div>
  );
}
