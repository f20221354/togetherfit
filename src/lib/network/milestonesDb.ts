import { getPool } from "@/lib/db";
import { getOrCreateIdentity, getUserRowByEmail, isUuid, UserRow } from "./friendsDb";
import { SPORT_KEYS } from "@/lib/connect/sports";
import { CELEBRATION_REACTIONS, CelebrationCard, MILESTONES, milestoneDef } from "@/lib/connect/milestones";

/** Streaks count calendar days in India time — the app's audience. */
const STREAK_TZ = "Asia/Kolkata";
const CELEBRATION_TTL = "24 hours";

interface MilestoneRow {
  id: string;
  key: string;
  sport: string | null;
  achieved_at: string;
}

function toCard(row: MilestoneRow, userName: string): CelebrationCard | null {
  const def = milestoneDef(row.key);
  if (!def) return null;
  return {
    milestoneId: row.id,
    key: def.key,
    title: def.title,
    description: def.description,
    icon: def.icon,
    sport: row.sport,
    achievedAt: row.achieved_at,
    userName,
  };
}

async function isAcceptedParticipant(userId: string, connectionId: string): Promise<boolean> {
  const result = await getPool().query(
    "select 1 from connections where id = $1 and status = 'accepted' and (requester_id = $2 or receiver_id = $2)",
    [connectionId, userId]
  );
  return result.rows.length > 0;
}

async function isGroupMember(userId: string, groupId: string): Promise<boolean> {
  const result = await getPool().query("select 1 from group_members where group_id = $1 and user_id = $2", [groupId, userId]);
  return result.rows.length > 0;
}

interface Progress {
  total: number;
  streak: number;
  group: number;
  withConnection: number;
}

async function progressFor(userId: string, connectionId: string | null): Promise<Progress> {
  const pool = getPool();
  const counts = await pool.query<{ total: string; grp: string; with_conn: string }>(
    `select count(*) as total,
            count(*) filter (where group_id is not null) as grp,
            count(*) filter (where connection_id = $2) as with_conn
     from activity_sessions where user_id = $1`,
    [userId, connectionId]
  );
  const days = await pool.query<{ d: string; today: string }>(
    `select distinct to_char(completed_at at time zone '${STREAK_TZ}', 'YYYY-MM-DD') as d,
            to_char(now() at time zone '${STREAK_TZ}', 'YYYY-MM-DD') as today
     from activity_sessions where user_id = $1
     order by d desc limit 40`,
    [userId]
  );

  // Consecutive days ending today (or yesterday, so a streak survives until you miss a whole day).
  let streak = 0;
  if (days.rows.length > 0) {
    const set = new Set(days.rows.map((r) => r.d));
    const cursor = new Date(`${days.rows[0].today}T00:00:00Z`);
    if (!set.has(days.rows[0].today)) cursor.setUTCDate(cursor.getUTCDate() - 1);
    while (set.has(cursor.toISOString().slice(0, 10))) {
      streak++;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }
  }

  const c = counts.rows[0];
  return { total: Number(c.total), streak, group: Number(c.grp), withConnection: Number(c.with_conn) };
}

export interface LogActivityInput {
  sport: string;
  connectionId?: string | null;
  groupId?: string | null;
}

export type LogActivityResult = { ok: true; newMilestones: CelebrationCard[] } | { ok: false; error: string };

/** Records a completed activity, then awards any milestones it unlocked. */
export async function logActivity(email: string, name: string, input: LogActivityInput): Promise<LogActivityResult> {
  if (!SPORT_KEYS.has(input.sport)) return { ok: false, error: "Unknown activity" };
  await getOrCreateIdentity(email, name);
  const me = (await getUserRowByEmail(email)) as UserRow;
  const connectionId = input.connectionId || null;
  const groupId = input.groupId || null;

  if (connectionId && !(isUuid(connectionId) && (await isAcceptedParticipant(me.id, connectionId)))) {
    return { ok: false, error: "You can only log sessions with an accepted friend" };
  }
  if (groupId && !(isUuid(groupId) && (await isGroupMember(me.id, groupId)))) {
    return { ok: false, error: "Join this group first" };
  }

  const pool = getPool();
  await pool.query("insert into activity_sessions (user_id, sport, connection_id, group_id) values ($1, $2, $3, $4)", [
    me.id,
    input.sport,
    connectionId,
    groupId,
  ]);

  const progress = await progressFor(me.id, connectionId);
  const newMilestones: CelebrationCard[] = [];
  for (const def of MILESTONES) {
    if (def.metric === "withConnection" && !connectionId) continue;
    if (progress[def.metric] < def.target) continue;
    const ref = def.metric === "withConnection" ? connectionId! : "";
    const inserted = await pool.query<MilestoneRow>(
      `insert into milestones (user_id, key, ref, sport) values ($1, $2, $3, $4)
       on conflict (user_id, key, ref) do nothing
       returning id, key, sport, achieved_at`,
      [me.id, def.key, ref, input.sport]
    );
    const card = inserted.rows[0] && toCard(inserted.rows[0], me.name);
    if (card) newMilestones.push(card);
  }
  return { ok: true, newMilestones };
}

export interface MilestonesOverview {
  achieved: CelebrationCard[];
  progress: Omit<Progress, "withConnection">;
}

export async function listMilestones(email: string): Promise<MilestonesOverview> {
  const me = await getUserRowByEmail(email);
  if (!me) return { achieved: [], progress: { total: 0, streak: 0, group: 0 } };
  const rows = await getPool().query<MilestoneRow>(
    "select id, key, sport, achieved_at from milestones where user_id = $1 order by achieved_at desc",
    [me.id]
  );
  const { total, streak, group } = await progressFor(me.id, null);
  return {
    achieved: rows.rows.map((r) => toCard(r, me.name)).filter((c): c is CelebrationCard => c !== null),
    progress: { total, streak, group },
  };
}

/** Sends one of your own milestones into a chat with an accepted friend, as a 24h celebration card. */
export async function sendCelebration(email: string, milestoneId: string, connectionId: string): Promise<{ ok: boolean; error?: string }> {
  if (!isUuid(milestoneId) || !isUuid(connectionId)) return { ok: false, error: "Invalid request" };
  const me = await getUserRowByEmail(email);
  if (!me) return { ok: false, error: "Unknown user" };
  if (!(await isAcceptedParticipant(me.id, connectionId))) return { ok: false, error: "You can only send to an accepted friend" };
  const pool = getPool();
  const row = await pool.query<MilestoneRow>("select id, key, sport, achieved_at from milestones where id = $1 and user_id = $2", [
    milestoneId,
    me.id,
  ]);
  const card = row.rows[0] && toCard(row.rows[0], me.name);
  if (!card) return { ok: false, error: "Milestone not found" };
  await pool.query(
    `insert into messages (connection_id, sender_id, type, body, expires_at)
     values ($1, $2, 'celebration', $3, now() + interval '${CELEBRATION_TTL}')`,
    [connectionId, me.id, JSON.stringify(card)]
  );
  return { ok: true };
}

/** The receiver (never the sender) reacts to a celebration card with one emoji. */
export async function reactToCelebration(email: string, connectionId: string, messageId: string, emoji: string): Promise<{ ok: boolean }> {
  if (!CELEBRATION_REACTIONS.includes(emoji) || !isUuid(connectionId) || !isUuid(messageId)) return { ok: false };
  const me = await getUserRowByEmail(email);
  if (!me || !(await isAcceptedParticipant(me.id, connectionId))) return { ok: false };
  const result = await getPool().query(
    `update messages set reaction = $1
     where id = $2 and connection_id = $3 and type = 'celebration' and sender_id != $4
       and (expires_at is null or expires_at > now())`,
    [emoji, messageId, connectionId, me.id]
  );
  return { ok: (result.rowCount ?? 0) > 0 };
}
