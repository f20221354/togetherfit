"use client";

import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { BottomTabBar } from "./BottomTabBar";
import { FriendRequestNotifier } from "@/components/connect/FriendRequestNotifier";
import { CelebrationOverlay } from "@/components/connect/CelebrationOverlay";
import { PostureMonitorProvider } from "@/components/camera/PostureMonitorProvider";
import { PostureNudgeToast } from "@/components/camera/PostureNudgeToast";
import { WinterArcPopup } from "@/components/winterArc/WinterArcPopup";
import { useRealtimeConnection } from "@/lib/realtime/client";
import { useWellnessDayRollover } from "@/lib/store/wellnessStore";
import { RestrictionBanner } from "@/components/safety/RestrictionBanner";

export function AppShell({ children }: { children: React.ReactNode }) {
  useRealtimeConnection();
  useWellnessDayRollover();
  return (
    <PostureMonitorProvider>
    <div className="flex min-h-dvh bg-background text-foreground">
      <Sidebar />
      <div className="flex min-h-dvh min-w-0 flex-1 flex-col">
        <Header />
        <RestrictionBanner />
        <main className="flex-1 overflow-y-auto px-4 pb-[calc(5rem+env(safe-area-inset-bottom))] pt-6 md:px-8 md:pb-8">{children}</main>
      </div>
      <BottomTabBar />
      <FriendRequestNotifier />
      <CelebrationOverlay />
      <PostureNudgeToast />
      <WinterArcPopup />
    </div>
    </PostureMonitorProvider>
  );
}
