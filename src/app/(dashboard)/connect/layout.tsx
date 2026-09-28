import { ConnectSubNav } from "@/components/connect/ConnectSubNav";

export default function ConnectLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl">
      <ConnectSubNav />
      {children}
    </div>
  );
}
