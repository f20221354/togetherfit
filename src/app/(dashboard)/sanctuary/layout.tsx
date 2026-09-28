import { SanctuarySubNav } from "@/components/sanctuary/SanctuarySubNav";

export default function SanctuaryLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl">
      <SanctuarySubNav />
      {children}
    </div>
  );
}
