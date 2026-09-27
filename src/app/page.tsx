import { GlobalScoreCard } from "@/components/dashboard/GlobalScoreCard";
import { ModuleOverview } from "@/components/dashboard/ModuleOverview";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { Recommendations } from "@/components/dashboard/Recommendations";
import { WellnessTrendChart } from "@/components/dashboard/WellnessTrendChart";
import { EcosystemMap } from "@/components/dashboard/EcosystemMap";
import { ActivityExplorer } from "@/components/dashboard/ActivityExplorer";

export default function HomePage() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <GlobalScoreCard />

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/40">
          Module Overview
        </h2>
        <ModuleOverview />
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/40">
          Quick Actions
        </h2>
        <QuickActions />
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/40">
          Recommended For You
        </h2>
        <Recommendations />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <WellnessTrendChart />
        <EcosystemMap />
      </div>

      <ActivityExplorer />
    </div>
  );
}
