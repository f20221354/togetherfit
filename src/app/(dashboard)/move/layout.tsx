import { MoveSubNav } from "@/components/move/MoveSubNav";

export default function MoveLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl">
      <MoveSubNav />
      {children}
    </div>
  );
}
