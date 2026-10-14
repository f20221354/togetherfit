import Link from "next/link";
import { TogetherfitLogo } from "@/components/brand/TogetherfitLogo";

export const LEGAL_CONTACT_EMAIL = "togetherfit3@gmail.com";
export const LEGAL_LAST_UPDATED = "15 October 2026";

/** Shared shell for /privacy and /terms: public, readable without an account. */
export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-background px-4 py-10 text-foreground">
      <article className="mx-auto flex max-w-2xl flex-col gap-6">
        <Link href="/" aria-label="togetherfit home" className="self-start">
          <TogetherfitLogo layout="inline" size={32} />
        </Link>
        <header>
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="mt-1 text-sm text-muted">Last updated: {LEGAL_LAST_UPDATED}</p>
        </header>
        <div className="flex flex-col gap-6 text-sm leading-relaxed text-foreground [&_a]:text-accent-foreground [&_a]:underline [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1.5 [&_p+p]:mt-2 [&_p+ul]:mt-2 [&_ul+p]:mt-2">
          {children}
        </div>
        <footer className="border-t border-border pt-4 text-xs text-muted">
          <Link href="/privacy" className="hover:text-foreground hover:underline">Privacy Policy</Link>
          {" · "}
          <Link href="/terms" className="hover:text-foreground hover:underline">Terms of Service</Link>
          {" · "}
          <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className="hover:text-foreground hover:underline">{LEGAL_CONTACT_EMAIL}</a>
        </footer>
      </article>
    </div>
  );
}
