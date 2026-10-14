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

Privacy: other members only ever see your name and friend code, never your
email. Workouts, wellness and breathing data stay in the browser, stored
separately per account. **Settings → Your Data** downloads everything we hold
(`/api/account/export`) or permanently deletes the account
(`/api/account/delete`, password required). The Privacy Policy and Terms are
at `/privacy` and `/terms`.

## Trust & safety

- **Profile photos** (My Profile at `/profile`, or onboarding): cropped in the
  browser, then re-encoded on the server with `sharp`, which strips EXIF data
  such as GPS location. Stored in Postgres (`profile_photos`, ~30 KB each).
  Served only through `/api/photos/<id>`, which checks on every request that
  the viewer is the owner, an accepted friend, or someone who can see them on
  Find a Friend *and* the owner turned on "show my photo on Find a Friend".
- **Gender (optional) and comfort preferences** (Settings → Privacy & safety): Anyone / Women only / Men
  only, plus "only match verified people". Matching is **mutual**: both
  people's preferences must fit each other (`src/lib/trust/matching.ts`),
  enforced in the radar query and when sending a radar request. Gender is
  never shown to others and can change once every 30 days.
- **Verification (✓ badge)**: a live selfie compared automatically with the
  profile photo. Clear passes are verified, clear fails rejected, unsure
  results ask to retry; 3 tries a day. Only scores and the decision are
  stored. Changing your photo removes the badge. Provider set by
  `VERIFICATION`: `mock` (default, for development/UAT), `off`, and later
  `aws` (Amazon Rekognition).
- **Friends page**: Friends / Received / Sent tabs; sent requests can be
  cancelled. Every friend (and the chat header) has a ⋯ menu: Remove friend
  (silent, deletes the chat), Block, Report (also blocks).
- **Restrictions** (`src/lib/safety/restrictions.ts`): one report only blocks
  the two people from each other. A "felt unsafe" or "harassment" report hides
  the reported person from Find a Friend until reviewed. Reports worth 3+
  points from different people in 30 days (1 each, +0.5 verified, +0.5 if the
  account is over a week old, 0.25 for people whose reports keep being
  dismissed) restrict the account fully: 7 days, then 30, then permanently.
  Restricted people can still sign in, export, delete and appeal.
- **Moderation** (`/moderation`, admins only): open reports (with categories)
  and people stuck in verification. Make someone an admin with
  `npm run admin:grant -- their@email.com`.

## Chat (friends and groups)

Postgres holds every message. Opening a chat loads the newest 50; older ones
load in pages of 50 as you scroll up. After that the browser only ever asks
for *changes* (`GET …/messages?since=<time>`): new messages and reactions.
Group chats (`/api/groups/<id>/messages`) work the same way, members only.

What triggers that request is set by `REALTIME`:

| `REALTIME` | How new messages arrive | Use it for |
|---|---|---|
| `poll` (default) | The browser checks every 5 s | Any hosting, no extra service: UAT, small launches |
| `ably` | Instantly: after saving, the server sends a tiny "conversation X changed" signal through [Ably](https://ably.com) to each person's private `user:<id>` channel. Needs `ABLY_API_KEY` | Vercel, where functions can't keep connections open |
| `sse` | Instantly, pushed by our own server: each tab keeps one Server-Sent Events stream (`/api/realtime/stream`); Postgres `NOTIFY` carries signals between server processes, each holding one `LISTEN` connection | Self-hosting on a long-running server (the Docker setup uses it) |

In every mode, signals contain ids only, never message text, and the browser
asks `/api/realtime/config` how to listen (for Ably, it returns a token that
can only *subscribe* to the user's own channel). After reconnecting, coming
back to the tab, or going back online, the browser asks for everything since
its last check, so nothing is missed. A bad setting never breaks chat: it
falls back to `poll` and logs why. The drivers live in `src/lib/realtime/drivers/`.

Sending is safe to retry: each message carries a browser-generated id, so a
retry after a network error never creates a duplicate. Expired celebration
cards are hidden by every query and deleted once a day by a cron job calling
`/api/cron/cleanup-messages` with `CRON_SECRET` (Vercel Cron via `vercel.json`;
when self-hosting, a system cron entry).

Environment variables:

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | Postgres connection string |
| `AUTH_SECRET` | in production | ≥ 32 random characters; keys the OTP hashes (`openssl rand -base64 48`) |
| `SES_REGION` | in production (or SMTP) | AWS region where the sending domain is verified in Amazon SES, e.g. `ap-south-1`. With neither SES nor SMTP set in development, emails are printed to the server console |
| `EMAIL_FROM` | with SES | Sender, e.g. `togetherfit <no-reply@yourdomain.com>` (a verified SES identity). Optional with SMTP |
| `SMTP_USER` / `SMTP_PASS` | in production (or SES) | Interim email before SES: for Gmail, the address and an app password. Used only when SES isn't configured |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` | no | Defaults to `smtp.gmail.com` / `465` with implicit TLS; `SMTP_SECURE=true\|false` for other ports |
| `SES_ACCESS_KEY_ID` / `SES_SECRET_ACCESS_KEY` | when not on AWS | IAM user with only `ses:SendEmail`. Omit when the app runs on AWS with an IAM role |
| `SES_CONFIGURATION_SET` | no | SES configuration set, for bounce/complaint tracking |
| `DATABASE_SSL` | no | TLS is verified by default. `false` for a local database without TLS; `no-verify` to skip the certificate check (not recommended) |
| `DATABASE_CA_CERT` | no | PEM of your database provider's CA, if it doesn't use a publicly trusted certificate |
| `CAPTCHA` | in production | `turnstile` turns on the bot check for sign-up and password reset |
| `TURNSTILE_SECRET_KEY` / `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | with `CAPTCHA=turnstile` | Cloudflare Turnstile keys (free). The site key is read at build time |
| `TRUSTED_PROXY_HOPS` | when self-hosting | Number of proxies in front of the app that append to `X-Forwarded-For` (default `1`). Used for rate limiting |
| `CLIENT_IP_HEADER` | no | A header your proxy sets with the client IP (e.g. `cf-connecting-ip`), used instead of `X-Forwarded-For` |
| `VERIFICATION` | no | Selfie verification and photo checks: `mock` (default) or `off`. **`mock` badges are not real — switch to a real provider before launch** |
| `MOCK_VERIFICATION_OUTCOME` | no | With `VERIFICATION=mock`: `pass` (default), `unsure` or `fail`, to test each path |
| `REALTIME` | no | How chat updates are delivered: `poll` (default), `ably` or `sse`. See [Friend chat](#chat-friends-and-groups) |
| `ABLY_API_KEY` | with `REALTIME=ably` | Ably API key; check it with `npm run realtime:test` |
| `ERROR_WEBHOOK_URL` | no | Slack or Discord incoming-webhook URL; server and page crashes are posted there (each distinct error at most every 10 min). Every error is also logged as one JSON line |
| `CRON_SECRET` | in production | Protects `/api/cron/cleanup-messages`; Vercel Cron sends it automatically (see `vercel.json`) |
| `GROQ_API_KEY` | no | AI Coach answers. Crisis and emergency messages never reach the model (`src/lib/move/coachSafety.ts`) |

Check the email setup on its own with `npm run email:test -- you@example.com`.

Accounts created before server-side auth have no password: their owners
use **Forgot password** to set one (proving the email with a code).

## Getting started

```bash
npm install
npm run dev

## Tests

- `npm test`: unit tests (scoring, distance privacy, client IP, AI coach safety).
- `npm run test:api`: API tests against a running production build, using
  real email codes through a fake mail server. See `tests/README.md`.
