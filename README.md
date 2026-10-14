# togetherfit

**All connected. All in one place.**

togetherfit is a unified consumer wellness dashboard — not five disconnected
mini-apps, but one product where every action feeds a single **Global
Wellness Score** and ripples across the rest of the system. Complete a
workout, and Sanctuary's room gets brighter. Finish a breathing reset, and
UrgeSurfer's data shows up in your daily Overview. Find a real workout
partner in Connect, log the session together, and you both unlock a
milestone.

🔗 **Live demo:** [vitaos-jd8j.vercel.app](https://vitaos-jd8j.vercel.app)

> Create an account (**Create Account** on the login page) and confirm the
> 6-digit code we email you. Accounts live on the server, so the same login
> works on any device.

---

## The modules

togetherfit is organized around one **Overview** dashboard plus five tabs,
split into two groups:

**Action / social**

| Module | What it does |
|---|---|
| 🤝 **Connect** | A real, cross-device social layer backed by Postgres. **Find a Friend** matches you with real people nearby doing the same activity right now or scheduled for later, via a live radar (privacy-first: your location is rounded to ~500 m and never stored or shown exactly). Send a request, chat 1:1 or in a group once accepted, and add friends directly with a shareable code. Logging a session together unlocks **Milestones** — first activity, streaks, 10 sessions with a friend, first group activity — each with a shareable, confetti celebration card. |
| 🏋️ **Move & Coach** | Your personal fitness layer: goals (distance/frequency/strength/mobility/custom), an **AI Coach** that suggests and builds workouts from your activity history, a workout builder + set-by-set player, and an exercise library where every move gets step-by-step instructions, a Do/Don't list, and a real photo. |

**Wellness / self-monitoring**

| Module | What it does |
|---|---|
| 🌿 **Sanctuary** | A living bio-room that visually reflects your Global Wellness Score, plus daily habit tracking (hydration, stretching, sunlight, digital wellness) and a **Circadian Arc** section for light exposure and sleep-window timing. |
| 👁 **Posture & Gaze Guard** | Real-time, on-device posture and eye-level monitoring via your webcam (MediaPipe FaceLandmarker) — nothing is recorded or uploaded. Monitoring runs app-wide once started, and a supportive nudge reminds you every minute until you correct your posture, even in another window (with your permission, via a browser notification). A manual demo-slider fallback covers devices with no camera. |
| 🫁 **UrgeSurfer** | A fast recovery/reset module with three independently selectable modes: **Breathe** (a fully custom, user-timed breathing engine), **Rhythm** (a tap-to-beat metronome), and **Ground** (an interactive 5-4-3-2-1 grounding exercise). |

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
- **[Leaflet](https://leafletjs.com)** + OpenStreetMap / Nominatim — the Find a Friend area picker and radar map
- **[pg](https://node-postgres.com)** (Postgres) — the real backend behind Connect: friends, Find a Friend, groups, chat, and milestones

## Authentication

Email + password, with a one-time code emailed on signup, on every login and
for password resets. Passwords are hashed with scrypt; sessions are random
tokens in an httpOnly cookie, stored hashed in Postgres; every API route
takes the user from the session (`requireUser`), never from the request.
Auth, chat, friend requests, the AI coach and analytics are rate-limited
(Postgres-backed, so limits hold across instances).

Environment variables:

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | Postgres connection string |
| `AUTH_SECRET` | in production | ≥ 32 random characters; keys the OTP hashes (`openssl rand -base64 48`) |
| `SES_REGION` | in production (or SMTP) | AWS region where the sending domain is verified in Amazon SES, e.g. `ap-south-1`. With neither SES nor SMTP set in development, emails are printed to the server console |
| `EMAIL_FROM` | with SES | Sender, e.g. `togetherfit <no-reply@yourdomain.com>` (a verified SES identity). Optional with SMTP |
| `SMTP_USER` / `SMTP_PASS` | in production (or SES) | Interim email before SES: for Gmail, the address and an app password. Used only when SES isn't configured |
| `SMTP_HOST` / `SMTP_PORT` | no | Defaults to `smtp.gmail.com` / `465` |
| `SES_ACCESS_KEY_ID` / `SES_SECRET_ACCESS_KEY` | when not on AWS | IAM user with only `ses:SendEmail`. Omit when the app runs on AWS with an IAM role |
| `SES_CONFIGURATION_SET` | no | SES configuration set, for bounce/complaint tracking |
| `DATABASE_SSL` | no | `false` for a local database without SSL |
| `GROQ_API_KEY` | no | AI Coach answers |
| `WINTER_ARC_ADMIN_KEY` | no | Unlocks `/admin/winter-arc` |

Check the email setup on its own with `npm run email:test -- you@example.com`.

Accounts created before server-side auth have no password: their owners
use **Forgot password** to set one (proving the email with a code).

## Getting started

```bash
npm install
npm run dev
