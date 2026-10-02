import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Winter Arc analytics",
  robots: { index: false, follow: false },
};

export default function WinterArcAdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-background px-4 py-8 text-foreground md:px-8">{children}</div>;
}
