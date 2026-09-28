# स्वस्थ Bharat

**One wellness operating system, five interconnected modules.**

स्वस्थ Bharat is a unified consumer wellness dashboard — not five disconnected
mini-apps, but one product where every action feeds a single **Global
Wellness Score** and ripples across the rest of the system. Complete a
workout, and Sanctuary's room gets brighter. Finish a breathing reset, and
UrgeSurfer's data shows up in your daily Overview. Find a running partner
in Connect, log the run, and your Move & Coach progress updates.

🔗 **Live demo:** [vitaos-jd8j.vercel.app](https://vitaos-jd8j.vercel.app)

> This is a frontend prototype. All "real people" (activity partners,
> personal trainers) are clearly labeled demo data — see
> [Prototype status](#prototype-status--privacy) below.

---

## The modules

स्वस्थ Bharat is organized around one **Overview** ("My Day") dashboard plus five
tabs, split into two groups:

**Action / social**

| Module | What it does |
|---|---|
| 🤝 **Connect** | Find real people for running, walking, gym, cycling, yoga, and small-group activities — activity-first discovery, a transparent Wellness Compatibility Score, connection requests, 1:1/group chat, and a Trainer Connect marketplace for real human coaching. Explicitly *not* a dating app. |
| 🏋️ **Move & Coach** | Your personal fitness layer: goals (distance/frequency/strength/mobility/custom), an AI Coach that suggests workouts based on your actual history, a workout builder + set-by-set player, and a 12-exercise library where every move gets an animated **Do vs. Don't** form comparison. |

**Wellness / self-monitoring**

| Module | What it does |
|---|---|
| 🌿 **Sanctuary** | A living bio-room that visually reflects your Global Wellness Score, plus daily habit tracking (hydration, stretching, sunlight, digital wellness) and a **Circadian Arc** section for light exposure and sleep-window timing. |
| 👁 **Posture & Gaze Guard** | Real-time, on-device posture and eye-level monitoring via your webcam (MediaPipe FaceLandmarker) with temporal smoothing, cooldown-based alerts, and a manual demo-slider fallback when no camera is available. |
| 🫁 **UrgeSurfer** | A fast recovery/reset module with three real, independently selectable modes: **Breathe** (a fully custom 4-phase breathing engine — every duration is user-controlled, not hard-coded), **Rhythm** (a tap-to-beat metronome with BPM control and consistency scoring), and **Ground** (an interactive 5-4-3-2-1 grounding exercise). |

Every module writes into the same event pipeline, so the **Activity
Explorer** and Global Wellness Score always reflect what actually happened,
across every tab.

---

## Tech stack

- **[Next.js 16](https://nextjs.org)** (App Router, Turbopack) + **React 19** + **TypeScript**
- **Tailwind CSS v4** — theme tokens (`--background`, `--surface`, `--accent`, …) drive light/dark/system theming via **[next-themes](https://github.com/pacocoursey/next-themes)**, with zero hard-coded colors
- **[Zustand](https://github.com/pmndrs/zustand)** (`persist` middleware) — one store per module domain, all persisted to `localStorage`
- **[Framer Motion](https://www.framer.com/motion/)** — the breathing engine's circle animation, exercise Do/Don't silhouettes, and UI transitions
- **[MediaPipe Tasks Vision](https://developers.google.com/mediapipe)** — on-device face-landmark inference for Posture & Gaze Guard (nothing is ever uploaded)
- **[Recharts](https://recharts.org)** — wellness trend charts

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The first run walks
you through signup → onboarding (capabilities, camera permission,
optional wellness setup) → the Overview dashboard.

Other scripts:

```bash
npm run build   # production build
npm run start   # serve the production build
npm run lint    # ESLint
```

### Demo Mode

Toggle **⚡ DEMO** in the header to simulate realistic events across every
module (workouts, resets, sunlight walks, posture corrections, …) on a
timer, so the dashboard feels alive without manually clicking through
every action yourself.

---

## Project structure

```
src/
├── app/
│   ├── login/ signup/ forgot-password/ onboarding/   # unauthenticated flow
│   └── (dashboard)/                                  # authenticated app shell
│       ├── page.tsx                                  # Overview ("My Day")
│       ├── connect/                                  # discover, chat, plans, trainers
│       ├── move/                                     # goals, coach, workout, exercises, progress
│       ├── sanctuary/                                # bio-room + circadian/ sub-section
│       ├── posture/                                  # camera posture monitoring
│       ├── urgesurfer/                               # breathe / rhythm / ground
│       ├── personal/                                 # mobile-only module menu
│       └── settings/                                 # account, privacy, appearance
├── components/
│   ├── shell/          # Sidebar, MobileNav, Header, AppShell
│   ├── connect/ move/ sanctuary/ urgesurfer/ camera/  # per-module UI
│   ├── dashboard/       # Overview widgets (GlobalScoreCard, EcosystemMap, …)
│   └── ui/              # shared primitives (Badge, ProgressBar, ManualCounter, …)
└── lib/
    ├── store/           # one Zustand store per domain (wellness, connect, move, breathing, camera, …)
    ├── auth/            # mock local auth (hashed passwords, structured to swap in a real backend)
    ├── breathing/ camera/ connect/ move/  # domain logic (engines, mock data, scoring)
    └── types.ts         # shared cross-module types (ModuleKey, EventType, …)
```

## Architecture notes

- **Single source of truth per concern.** The breathing engine, for
  example, uses one `requestAnimationFrame` clock to drive the countdown,
  phase, cycle count, *and* the circle's animation — so pause genuinely
  freezes everything and the visual can never drift from the numbers.
- **Shared event pipeline.** `useWellnessStore().logEvent(type)` is the
  only way any module affects scores — every completed workout, reset,
  partner activity, or habit log flows through the same catalog, so the
  Global Wellness Score and Activity Explorer are always consistent.
- **Module ownership.** Each module's data lives in its own store
  (`connectStore`, `moveStore`, `breathingStore`, `cameraStore`, …) even
  where two modules share a UI tab (Sanctuary/Circadian) or a
  cross-module bridge exists (e.g. Move & Coach → Connect for "Find a
  Gym Partner").
- **Mock/local data, real architecture.** Auth, chat, and trainer
  connections are local-only for this prototype, but structured (typed
  models, clear seams) so a real backend — Supabase/Auth.js for auth,
  Postgres for storage, WebSockets for chat — can be swapped in without
  restructuring the UI.

## Prototype status & privacy

- **Camera:** Posture & Gaze Guard processes your webcam feed **entirely
  in your browser**. No video frame is ever recorded, saved, or sent to a
  server — only derived numbers (angle, tilt, a posture status) ever
  enter application state. If no camera is available, a manual demo-slider
  fallback simulates the same signals, clearly labeled **DEMO DATA**.
- **People:** Activity partners and personal trainers in Connect are
  fictional demo profiles, clearly marked as such — this is not a real
  social network or trainer marketplace.
- **Auth:** Login uses a local, hashed-password mock (no plaintext
  storage), intentionally structured so a real auth provider can replace
  it later.

## Credits

Exercise demonstration photos in the Exercise Library are sourced from
[free-exercise-db](https://github.com/yuhonas/free-exercise-db)
(public domain / Unlicense).

## Deployment

Deployed on [Vercel](https://vercel.com). Any push to `master` can be
redeployed with:

```bash
npx vercel --prod
```
