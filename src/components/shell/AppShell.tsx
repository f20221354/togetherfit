"use client";

import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { FriendRequestNotifier } from "@/components/connect/FriendRequestNotifier";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <Header />
        <main className="flex-1 overflow-y-auto px-4 pb-6 pt-6 md:px-8 md:pb-8">{children}</main>
      </div>
      <FriendRequestNotifier />
    </div>
  );
}
