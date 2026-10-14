# Wellness score (v1)

The score answers one question: **how well-rounded has today been?**

## Rules

1. **Every day starts empty.** At the user's local midnight all scores and
   daily counters (hydration, stretch, resets, walk minutes, sunlight,
   habits) reset. Before the first action, the app shows an empty state with
   suggested first actions, never a number.
2. **Only real actions count.** Each action in the event catalog
   (`src/lib/store/wellnessStore.ts`) adds points to one or more of five
   dimensions: posture, focus, movement, circadian, recovery. Slouching,
   doomscrolling and a low screen angle remove points.
3. **A dimension is full at 24 points.** Most actions are worth 6–12 points,
   so about three actions fill a dimension. Scores never go below 0 or
   above 100.
4. **The global score** is the weighted average of the five dimensions
   (equal weights, `src/lib/scoring.ts`). Dimensions you didn't touch count
   as 0, so the global score rewards a balanced day.
5. **History** keeps one global score per active day for 30 days. The
   7-day average only counts days with activity, and says how many there
   were. Days without activity are gaps in the chart, not zeros.

## What the UI shows

| State | Display |
|---|---|
| No action today | "Your day hasn't started yet" plus 3 first actions |
| Dimension not touched today | "–" (not "0") |
| Some activity | The number, out of 100 |
| Sanctuary room | Brightness 20–100% from today's score; dim before the first action |

Implementation: `src/lib/wellness/dailyScore.ts` (pure functions),
`src/lib/store/wellnessStore.ts` (state, midnight rollover, migration that
discards the old seeded values and rebuilds from real events).
