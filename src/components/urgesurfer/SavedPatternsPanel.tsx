"use client";

import { useState } from "react";
import { useBreathingStore } from "@/lib/store/breathingStore";
import { BreathingPattern, formatPattern } from "@/lib/breathing/types";

export function SavedPatternsPanel({
  currentPattern,
  onSelect,
  disabled,
}: {
  currentPattern: BreathingPattern;
  onSelect: (pattern: BreathingPattern) => void;
  disabled?: boolean;
}) {
  const savedPatterns = useBreathingStore((s) => s.savedPatterns);
  const savePattern = useBreathingStore((s) => s.savePattern);
  const deletePattern = useBreathingStore((s) => s.deletePattern);
  const [name, setName] = useState("");

  return (
    <div className="flex flex-col gap-3">
      <div className="text-xs font-semibold uppercase tracking-widest text-muted">My Patterns</div>
      <div className="flex flex-col gap-1.5">
        {savedPatterns.map((saved) => (
          <div key={saved.id} className="flex items-center justify-between gap-2 rounded-xl bg-surface-2 px-3 py-2">
            <button
              disabled={disabled}
              onClick={() => onSelect(saved.pattern)}
              className="flex flex-1 items-center gap-2 text-left text-sm text-foreground disabled:opacity-50"
            >
              <span>{saved.icon}</span>
              <span>{saved.name}</span>
              <span className="text-xs text-muted">{formatPattern(saved.pattern)}</span>
            </button>
            <button
              onClick={() => deletePattern(saved.id)}
              className="text-xs text-muted hover:text-danger"
              aria-label={`Delete ${saved.name}`}
            >
              ✕
            </button>
          </div>
        ))}
        {savedPatterns.length === 0 && <p className="text-xs text-muted">No saved patterns yet.</p>}
      </div>

      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Pattern name"
          className="flex-1 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-sm text-foreground outline-none focus:border-accent"
        />
        <button
          disabled={!name.trim()}
          onClick={() => {
            savePattern(name.trim(), "🫁", currentPattern);
            setName("");
          }}
          className="rounded-lg bg-accent/15 px-3 py-1.5 text-xs font-medium text-accent-foreground hover:bg-accent/25 disabled:opacity-50"
        >
          Save Pattern
        </button>
      </div>
    </div>
  );
}
