"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/shell/PageHeader";
import { PartnerCard } from "@/components/connect/PartnerCard";
import { ConnectRequestModal } from "@/components/connect/ConnectRequestModal";
import { SafetyReminder } from "@/components/connect/SafetyReminder";
import { useConnectStore } from "@/lib/store/connectStore";
import { MOCK_PARTNERS } from "@/lib/connect/mockPartners";
import { computeCompatibility } from "@/lib/connect/compatibility";
import { ACTIVITY_META, ActivityType, PartnerProfile, TimeOfDay } from "@/lib/connect/types";

const ACTIVITIES: ActivityType[] = [
  "running",
  "walking",
  "gym",
  "cycling",
  "yoga",
  "sports",
  "hiking",
  "sunlightWalk",
];

const TIMES: TimeOfDay[] = ["morning", "afternoon", "evening", "flexible"];

function DiscoverFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialActivity = (searchParams.get("activity") as ActivityType) || null;

  const criteria = useConnectStore((s) => s.criteria);
  const setCriteria = useConnectStore((s) => s.setCriteria);
  const sendRequest = useConnectStore((s) => s.sendRequest);
  const blockedIds = useConnectStore((s) => s.blockedIds);

  const [step, setStep] = useState<1 | 2 | 3 | 4>(initialActivity ? 2 : 1);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [requestTarget, setRequestTarget] = useState<PartnerProfile | null>(null);

  useEffect(() => {
    if (initialActivity) setCriteria({ activity: initialActivity });
  }, [initialActivity, setCriteria]);

  const results = useMemo(() => {
    return MOCK_PARTNERS.filter((p) => !blockedIds.includes(p.id) && !skipped.includes(p.id))
      .map((partner) => ({ partner, ...computeCompatibility(criteria, partner) }))
      .filter((r) => r.score >= 35)
      .sort((a, b) => b.score - a.score);
  }, [criteria, blockedIds, skipped]);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <PageHeader
        icon="🤝"
        title="Find a Wellness Partner"
        subtitle="Activity-first discovery — find people who fit your routine, not a dating feed."
      />

      {step === 1 && (
        <div className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-foreground">What do you want to do?</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {ACTIVITIES.map((activity) => (
              <button
                key={activity}
                onClick={() => {
                  setCriteria({ activity });
                  setStep(2);
                }}
                className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-surface p-5 text-sm font-medium text-foreground hover:border-accent/40 hover:bg-surface-2"
              >
                <span className="text-2xl">{ACTIVITY_META[activity].icon}</span>
                {ACTIVITY_META[activity].label}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-foreground">When?</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {TIMES.map((time) => (
              <button
                key={time}
                onClick={() => {
                  setCriteria({ time });
                  setStep(3);
                }}
                className="rounded-2xl border border-border bg-surface p-4 text-sm font-medium capitalize text-foreground hover:border-accent/40 hover:bg-surface-2"
              >
                {time}
              </button>
            ))}
          </div>
          <button onClick={() => setStep(1)} className="self-start text-xs text-muted hover:text-foreground">
            ← Back
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-foreground">Partner or small group?</h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => {
                setCriteria({ groupPreference: "partner", groupSize: 2 });
                setStep(4);
              }}
              className="rounded-2xl border border-border bg-surface p-5 text-sm font-medium text-foreground hover:border-accent/40 hover:bg-surface-2"
            >
              🤝 Partner
            </button>
            <button
              onClick={() => {
                setCriteria({ groupPreference: "group", groupSize: 3 });
                setStep(4);
              }}
              className="rounded-2xl border border-border bg-surface p-5 text-sm font-medium text-foreground hover:border-accent/40 hover:bg-surface-2"
            >
              👥 Small Group
            </button>
          </div>
          {criteria.groupPreference === "group" && (
            <label className="flex items-center justify-between text-sm text-foreground">
              Group size
              <select
                value={criteria.groupSize}
                onChange={(e) => setCriteria({ groupSize: Number(e.target.value) as 2 | 3 })}
                className="rounded-lg border border-border bg-surface px-2 py-1 text-sm"
              >
                <option value={2}>2 people</option>
                <option value={3}>3 people</option>
              </select>
            </label>
          )}
          <button onClick={() => setStep(2)} className="self-start text-xs text-muted hover:text-foreground">
            ← Back
          </button>
        </div>
      )}

      {step === 4 && (
        <div className="flex flex-col gap-5">
          <div className="rounded-2xl border border-border bg-surface p-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
              {ACTIVITY_META[criteria.activity].icon} Find a {ACTIVITY_META[criteria.activity].label} Partner
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs text-muted">
                Preferred distance (km)
                <input
                  type="text"
                  defaultValue={criteria.distanceKm ? `${criteria.distanceKm[0]}-${criteria.distanceKm[1]}` : ""}
                  placeholder="3-5"
                  onBlur={(e) => {
                    const parsed = parseRange(e.target.value);
                    if (parsed) setCriteria({ distanceKm: parsed });
                  }}
                  className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-muted">
                Pace (min/km)
                <input
                  type="text"
                  defaultValue={criteria.paceMinPerKm ? `${criteria.paceMinPerKm[0]}-${criteria.paceMinPerKm[1]}` : ""}
                  placeholder="6-7"
                  onBlur={(e) => {
                    const parsed = parseRange(e.target.value);
                    if (parsed) setCriteria({ paceMinPerKm: parsed });
                  }}
                  className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-muted">
                Search radius (km)
                <input
                  type="number"
                  value={criteria.radiusKm}
                  onChange={(e) => setCriteria({ radiusKm: Number(e.target.value) })}
                  className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-muted">
                Experience level
                <select
                  value={criteria.experienceLevel ?? ""}
                  onChange={(e) => setCriteria({ experienceLevel: (e.target.value || undefined) as never })}
                  className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground"
                >
                  <option value="">Any</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </label>
            </div>
          </div>

          <SafetyReminder />

          <div>
            <div className="mb-3 text-sm font-medium text-foreground">
              {results.length} compatible {results.length === 1 ? "partner" : "partners"} nearby
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {results.map(({ partner, score, reasons }) => (
                <PartnerCard
                  key={partner.id}
                  partner={partner}
                  activity={criteria.activity}
                  compatibility={score}
                  reasons={reasons}
                  onConnect={() => setRequestTarget(partner)}
                  onSkip={() => setSkipped((s) => [...s, partner.id])}
                />
              ))}
            </div>
          </div>

          <button onClick={() => setStep(3)} className="self-start text-xs text-muted hover:text-foreground">
            ← Back
          </button>
        </div>
      )}

      {requestTarget && (
        <ConnectRequestModal
          partner={requestTarget}
          criteria={criteria}
          onCancel={() => setRequestTarget(null)}
          onSend={(message) => {
            sendRequest(requestTarget.id, message);
            setRequestTarget(null);
            router.push("/move/activity");
          }}
        />
      )}
    </div>
  );
}

function parseRange(value: string): [number, number] | null {
  const match = value.match(/([\d.]+)\s*-\s*([\d.]+)/);
  if (!match) return null;
  return [parseFloat(match[1]), parseFloat(match[2])];
}

export default function DiscoverPage() {
  return (
    <Suspense fallback={null}>
      <DiscoverFlow />
    </Suspense>
  );
}
