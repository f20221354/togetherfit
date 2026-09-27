"use client";

import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";
import { Header } from "./Header";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#0b0d10] text-white">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <Header />
        <main className="flex-1 overflow-y-auto px-4 pb-24 pt-6 md:px-8 md:pb-8">{children}</main>
      </div>
      <MobileNav />
    </div>
  );
}
