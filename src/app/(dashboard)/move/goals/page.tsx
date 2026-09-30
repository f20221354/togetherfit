"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shell/PageHeader";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useMoveStore, GOAL_TYPE_LABELS } from "@/lib/store/moveStore";
import { GoalType } from "@/lib/move/types";

const GOAL_SUGGESTIONS: { icon: string; label: string; type: GoalType; target: number; unit: string }[] = [
  { icon: "🏃", label: "Run 5 km", type: "distance", target: 5, unit: "km" },
  { icon: "🚶", label: "Walk 8,000 steps/day", type: "duration", target: 8000, unit: "steps" },
  { icon: "🏋️", label: "Strength train 3x/week", type: "frequency", target: 3, unit: "sessions/week" },
  { icon: "💪", label: "Improve consistency", type: "consistency", target: 4, unit: "sessions/week" },
  { icon: "🧘", label: "Complete mobility sessions", type: "mobility", target: 5, unit: "sessions/week" },
  { icon: "☀️", label: "Get 15 minutes of outdoor movement", type: "duration", target: 15, unit: "min/day" },
  { icon: "🚴", label: "Cycle 20 km/week", type: "distance", target: 20, unit: "km/week" },
];

export default function GoalsPage() {
  const goals = useMoveStore((s) => s.goals);
  const createGoal = useMoveStore((s) => s.createGoal);
  const updateGoalProgress = useMoveStore((s) => s.updateGoalProgress);
  const deleteGoal = useMoveStore((s) => s.deleteGoal);

  const [showForm, setShowForm] = useState(false);
  const [label, setLabel] = useState("");
  const [type, setType] = useState<GoalType>("custom");
  const [target, setTarget] = useState(5);
  const [current, setCurrent] = useState(0);
  const [unit, setUnit] = useState("km");
  const [frequency, setFrequency] = useState(3);
  const [targetDate, setTargetDate] = useState("");

  function applySuggestion(s: (typeof GOAL_SUGGESTIONS)[number]) {
    setLabel(s.label);
    setType(s.type);
    setTarget(s.target);
    setUnit(s.unit);
    setShowForm(true);
  }

  function handleCreate() {
    if (!label.trim()) return;
    createGoal({
      label: label.trim(),
      icon: "🎯",
      type,
      target,
      current,
      unit,
      frequencyPerWeek: frequency || undefined,
      targetDate: targetDate || undefined,
    });
    setLabel("");
    setCurrent(0);
    setShowForm(false);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader icon="🎯" title="My Goals" subtitle="Set personal fitness goals togetherfit can help you reach." />

      <div className="flex flex-wrap gap-2">
        {GOAL_SUGGESTIONS.map((s) => (
          <button
            key={s.label}
            onClick={() => applySuggestion(s)}
            className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface-2"
          >
            {s.icon} {s.label}
          </button>
        ))}
        <button
          onClick={() => setShowForm(true)}
          className="rounded-full bg-accent/15 px-3 py-1.5 text-xs font-medium text-accent-foreground hover:bg-accent/25"
        >
          + Custom Goal
        </button>
      </div>

      {showForm && (
        <div className="rounded-2xl border border-border bg-surface p-5">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Create Your Goal</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs text-muted">
              Goal
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Run 5 km"
                className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted">
              Type
              <select
                value={type}
                onChange={(e) => setType(e.target.value as GoalType)}
                className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground"
              >
                {Object.entries(GOAL_TYPE_LABELS).map(([key, l]) => (
                  <option key={key} value={key}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted">
              Target
              <input
                type="number"
                value={target}
                onChange={(e) => setTarget(Number(e.target.value))}
                className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted">
              Current
              <input
                type="number"
                value={current}
                onChange={(e) => setCurrent(Number(e.target.value))}
                className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted">
              Unit
              <input
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted">
              Frequency / week
              <input
                type="number"
                value={frequency}
                onChange={(e) => setFrequency(Number(e.target.value))}
                className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted">
              Target date (optional)
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground"
              />
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleCreate}
              className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-black hover:opacity-90"
            >
              Create Goal
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {goals.map((goal) => {
          const pct = Math.min(100, Math.round((goal.current / goal.target) * 100));
          return (
            <div key={goal.id} className="rounded-2xl border border-border bg-surface p-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <span>{goal.icon}</span>
                  {goal.label}
                </div>
                <button onClick={() => deleteGoal(goal.id)} className="text-xs text-muted hover:text-danger">
                  Remove
                </button>
              </div>
              <ProgressBar value={pct} tone="good" />
              <div className="mt-2 flex items-center justify-between text-xs text-muted">
                <span>
                  {goal.current} / {goal.target} {goal.unit}
                </span>
                <span>{pct}%</span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="number"
                  defaultValue={goal.current}
                  onBlur={(e) => updateGoalProgress(goal.id, Number(e.target.value))}
                  className="w-20 rounded-lg border border-border bg-surface-2 px-2 py-1 text-xs text-foreground"
                />
                <span className="text-xs text-muted">Update progress</span>
              </div>
            </div>
          );
        })}
        {goals.length === 0 && <p className="text-sm text-muted">No goals yet. Pick a suggestion above to get started.</p>}
      </div>
    </div>
  );
}
