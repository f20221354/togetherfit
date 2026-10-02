import { getPool } from "@/lib/db";
import { WINTER_ARC_END_DATE, WINTER_ARC_START_DATE } from "@/lib/winterArc/config";
import { WINTER_ARC_EVENTS, WinterArcEvent } from "@/lib/winterArc/analytics";

/** Analytics days are India-time calendar days, like milestone streaks. */
const TZ = "Asia/Kolkata";

export function isWinterArcEvent(value: unknown): value is WinterArcEvent {
  return typeof value === "string" && (WINTER_ARC_EVENTS as readonly string[]).includes(value);
}

export async function recordWinterArcEvent(event: WinterArcEvent, email: string, props: unknown) {
  const pool = getPool();
  const json = props && typeof props === "object" ? JSON.stringify(props) : null;
  if (event === "winter_arc_daily_active") {
    // At most one daily_active row per user per day.
    await pool.query(
      `insert into winter_arc_events (event, user_email, props)
       select $1, $2, $3::jsonb
       where not exists (
         select 1 from winter_arc_events
         where event = $1 and user_email = $2
           and (occurred_at at time zone '${TZ}')::date = (now() at time zone '${TZ}')::date
       )`,
      [event, email, json]
    );
    return;
  }
  await pool.query("insert into winter_arc_events (event, user_email, props) values ($1, $2, $3::jsonb)", [
    event,
    email,
    json,
  ]);
}

export interface WinterArcEventTotals {
  events: number;
  users: number;
}

export interface WinterArcDailyRow {
  day: string;
  popupShown: number;
  joined: number;
  dismissed: number;
  pageViews: number;
  partnerClicks: number;
  /** Distinct users who engaged that day (any user). */
  activeUsers: number;
  /** Distinct joined users who engaged that day. */
  activeParticipants: number;
}

export interface WinterArcWeeklyRow {
  week: number;
  startDay: string;
  activeParticipants: number;
  /** Users who had joined by the end of this week. */
  joinedSoFar: number;
  /** activeParticipants ÷ joinedSoFar, as a percentage. */
  retentionPct: number;
}

export interface WinterArcStats {
  window: { start: string; end: string; timeZone: string };
  totals: Record<WinterArcEvent, WinterArcEventTotals>;
  optIns: number;
  /** joined events ÷ popup_shown events. */
  optInRatePerShowPct: number;
  /** joined users ÷ users who saw the popup. */
  optInRatePerUserPct: number;
  /** find_partner_clicked events ÷ page_viewed events. */
  findPartnerCtrPct: number;
  daily: WinterArcDailyRow[];
  weekly: WinterArcWeeklyRow[];
}

const pct = (num: number, den: number) => (den > 0 ? Math.round((num / den) * 1000) / 10 : 0);

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function dayDiff(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

export async function getWinterArcStats(): Promise<WinterArcStats> {
  const pool = getPool();
  const start = WINTER_ARC_START_DATE;
  const end = WINTER_ARC_END_DATE;
  const inWindow = `(occurred_at at time zone '${TZ}')::date between $1::date and $2::date`;

  const [totalsRes, dailyRes, activeRes, joinsRes] = await Promise.all([
    pool.query<{ event: string; events: string; users: string }>(
      `select event, count(*) as events, count(distinct user_email) as users
       from winter_arc_events where ${inWindow} group by event`,
      [start, end]
    ),
    pool.query<{ day: string; event: string; events: string; users: string }>(
      `select to_char((occurred_at at time zone '${TZ}')::date, 'YYYY-MM-DD') as day, event,
              count(*) as events, count(distinct user_email) as users
       from winter_arc_events where ${inWindow} group by 1, 2`,
      [start, end]
    ),
    pool.query<{ day: string; user_email: string }>(
      `select distinct to_char((occurred_at at time zone '${TZ}')::date, 'YYYY-MM-DD') as day, user_email
       from winter_arc_events where event = 'winter_arc_daily_active' and ${inWindow}`,
      [start, end]
    ),
    pool.query<{ user_email: string; day: string }>(
      `select user_email, to_char(min((occurred_at at time zone '${TZ}')::date), 'YYYY-MM-DD') as day
       from winter_arc_events where event = 'winter_arc_joined' and ${inWindow} group by user_email`,
      [start, end]
    ),
  ]);

  const totals = Object.fromEntries(WINTER_ARC_EVENTS.map((e) => [e, { events: 0, users: 0 }])) as Record<
    WinterArcEvent,
    WinterArcEventTotals
  >;
  for (const row of totalsRes.rows) {
    if (isWinterArcEvent(row.event)) totals[row.event] = { events: Number(row.events), users: Number(row.users) };
  }

  const joinDay = new Map(joinsRes.rows.map((r) => [r.user_email, r.day]));

  // One row per event day so far (up to today or the end date).
  const totalDays = dayDiff(start, end) + 1;
  const todayIndex = Math.min(totalDays - 1, dayDiff(start, new Date().toISOString().slice(0, 10)));
  const dailyMap = new Map<string, WinterArcDailyRow>();
  for (let i = 0; i <= todayIndex; i++) {
    const day = addDays(start, i);
    dailyMap.set(day, {
      day,
      popupShown: 0,
      joined: 0,
      dismissed: 0,
      pageViews: 0,
      partnerClicks: 0,
      activeUsers: 0,
      activeParticipants: 0,
    });
  }
  const field: Partial<Record<WinterArcEvent, Exclude<keyof WinterArcDailyRow, "day">>> = {
    winter_arc_popup_shown: "popupShown",
    winter_arc_joined: "joined",
    winter_arc_dismissed: "dismissed",
    winter_arc_page_viewed: "pageViews",
    winter_arc_find_partner_clicked: "partnerClicks",
    winter_arc_daily_active: "activeUsers",
  };
  for (const row of dailyRes.rows) {
    const target = dailyMap.get(row.day);
    const key = isWinterArcEvent(row.event) ? field[row.event] : undefined;
    if (!target || !key) continue;
    // Active users are distinct people; everything else is an event count.
    target[key] = key === "activeUsers" ? Number(row.users) : Number(row.events);
  }

  const weeks = Math.ceil(totalDays / 7);
  const weeklyActive = Array.from({ length: weeks }, () => new Set<string>());
  for (const row of activeRes.rows) {
    const joined = joinDay.get(row.user_email);
    if (!joined || joined > row.day) continue; // participants only, from the day they joined
    const target = dailyMap.get(row.day);
    if (target) target.activeParticipants += 1;
    const week = Math.floor(dayDiff(start, row.day) / 7);
    if (week >= 0 && week < weeks) weeklyActive[week].add(row.user_email);
  }

  const currentWeek = Math.floor(Math.max(0, todayIndex) / 7);
  const weekly: WinterArcWeeklyRow[] = [];
  for (let w = 0; w <= Math.min(currentWeek, weeks - 1); w++) {
    const weekStart = addDays(start, w * 7);
    const weekEnd = addDays(start, Math.min(totalDays - 1, w * 7 + 6));
    const joinedSoFar = [...joinDay.values()].filter((d) => d <= weekEnd).length;
    const active = weeklyActive[w].size;
    weekly.push({
      week: w + 1,
      startDay: weekStart,
      activeParticipants: active,
      joinedSoFar,
      retentionPct: pct(active, joinedSoFar),
    });
  }

  return {
    window: { start, end, timeZone: TZ },
    totals,
    optIns: joinDay.size,
    optInRatePerShowPct: pct(totals.winter_arc_joined.events, totals.winter_arc_popup_shown.events),
    optInRatePerUserPct: pct(joinDay.size, totals.winter_arc_popup_shown.users),
    findPartnerCtrPct: pct(totals.winter_arc_find_partner_clicked.events, totals.winter_arc_page_viewed.events),
    daily: [...dailyMap.values()],
    weekly,
  };
}
