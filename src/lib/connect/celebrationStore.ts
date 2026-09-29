"use client";

import { create } from "zustand";
import { CelebrationCard } from "./milestones";

/** Queue of celebration screens to show (not persisted — they're a moment, not state). */
interface CelebrationState {
  queue: CelebrationCard[];
  celebrate: (cards: CelebrationCard[]) => void;
  dismiss: () => void;
}

export const useCelebrationStore = create<CelebrationState>()((set) => ({
  queue: [],
  celebrate: (cards) => set((s) => ({ queue: [...s.queue, ...cards] })),
  dismiss: () => set((s) => ({ queue: s.queue.slice(1) })),
}));
