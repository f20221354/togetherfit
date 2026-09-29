import { getPool } from "@/lib/db";
import { SPORT_KEYS } from "@/lib/connect/sports";
import { approxDistanceKm, coarsen, geohash } from "./geo";
import {
  createConnectionRequest,
  getOrCreateIdentity,
  getUserRowByEmail,
  getUserRowById,
  isUuid,
  SendRequestResult,
  UserRow,
} from "./friendsDb";

/** Every intent occupies a one-hour slot; two intents match when their slots overlap. */
const SLOT_MINUTES = 60;
/** A "Now" searcher who stops sending heartbeats (closed the app, lost signal) drops off the radar after this. */
const NOW_TIMEOUT_SECONDS = 90;
const GROUP_LIFETIME_MINUTES = 120;

const HAVERSINE_KM = (a: string, b: string) => `
  2 * 6371 * asin(sqrt(
    power(sin(radians(${b}.area_lat - ${a}.area_lat) / 2), 2) +
    cos(radians(${a}.area_lat)) * cos(radians(${b}.area_lat)) *
    power(sin(radians(${b}.area_lng - ${a}.area_lng) / 2), 2)
  ))`;

const SLOT_START = (t: string) => `(case when ${t}.mode = 'now' then now() else ${t}.start_time end)`;

async function expireStale(): Promise<void> {
  const pool = getPool();
  await pool.query(
    `update activity_intents set status = 'expired'
     where status = 'active' and (
       (mode = 'now' and last_heartbeat < now() - interval '${NOW_TIMEOUT_SECONDS} seconds')
       or (mode = 'scheduled' and start_time < now() - interval '${SLOT_MINUTES} minutes'))`
  );
  await pool.query(
    `update groups set status = 'expired'
     where status = 'active' and start_time < now() - interval '${GROUP_LIFETIME_MINUTES} minutes'`
  );
}

// ---------- Intents ----------

export interface IntentInput {
  sport: string;
  lat: number;
  lng: number;
  areaLabel?: string | null;
  radiusKm: number;
  mode: "now" | "scheduled";
  startTime?: string | null;
}

export type CreateIntentResult = { ok: true; intentId: string } | { ok: false; error: string };

export async function createIntent(email: string, name: string, input: IntentInput): Promise<CreateIntentResult> {
  if (!SPORT_KEYS.has(input.sport)) return { ok: false, error: "Unknown sport" };
  if (!Number.isFinite(input.lat) || !Number.isFinite(input.lng) || Math.abs(input.lat) > 90 || Math.abs(input.lng) > 180) {
    return { ok: false, error: "Pick an area on the map first" };
  }
  const radiusKm = Math.min(50, Math.max(1, Number(input.radiusKm) || 5));
  if (input.mode !== "now" && input.mode !== "scheduled") return { ok: false, error: "Choose Now or Schedule" };

  let startTime = new Date();
  if (input.mode === "scheduled") {
    const parsed = input.startTime ? new Date(input.startTime) : null;
    if (!parsed || Number.isNaN(parsed.getTime())) return { ok: false, error: "Pick a date and time" };
    if (parsed.getTime() < Date.now() - 5 * 60_000) return { ok: false, error: "That time has already passed" };
    if (parsed.getTime() > Date.now() + 30 * 24 * 3600_000) return { ok: false, error: "Schedule within the next 30 days" };
    startTime = parsed;
  }

  await getOrCreateIdentity(email, name);
  const me = await getUserRowByEmail(email);
  if (!me) return { ok: false, error: "Account not found" };

  // Never trust the client to have rounded: coarsen again before storing.
  const { lat, lng } = coarsen(input.lat, input.lng);
  const pool = getPool();

  // One live search per person keeps matching simple and prevents duplicate cards.
  await pool.query("update activity_intents set status = 'cancelled' where user_id = $1 and status = 'active'", [me.id]);

  const inserted = await pool.query<{ id: string }>(
    `insert into activity_intents (user_id, sport, area_geohash, area_lat, area_lng, area_label, radius_km, mode, start_time)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9) returning id`,
    [
      me.id,
      input.sport,
      geohash(lat, lng),
      lat,
      lng,
      input.areaLabel?.slice(0, 120) || null,
      radiusKm,
      input.mode,
      startTime.toISOString(),
    ]
  );
  return { ok: true, intentId: inserted.rows[0].id };
}

/** Your current live search, if any, so you can get back to the radar. */
export async function getActiveIntent(email: string): Promise<{ intentId: string; sport: string; mode: string } | null> {
  const me = await getUserRowByEmail(email);
  if (!me) return null;
  await expireStale();
  const result = await getPool().query<{ id: string; sport: string; mode: string }>(
    "select id, sport, mode from activity_intents where user_id = $1 and status = 'active' order by created_at desc limit 1",
    [me.id]
  );
  const row = result.rows[0];
  return row ? { intentId: row.id, sport: row.sport, mode: row.mode } : null;
}

async function ownIntent(email: string, intentId: string): Promise<{ me: UserRow; status: string } | null> {
  if (!isUuid(intentId)) return null;
  const me = await getUserRowByEmail(email);
  if (!me) return null;
  const pool = getPool();
  const result = await pool.query<{ status: string }>(
    "select status from activity_intents where id = $1 and user_id = $2",
    [intentId, me.id]
  );
  return result.rows[0] ? { me, status: result.rows[0].status } : null;
}

export async function heartbeat(email: string, intentId: string): Promise<{ ok: boolean; active: boolean }> {
  const owned = await ownIntent(email, intentId);
  if (!owned) return { ok: false, active: false };
  await expireStale();
  const pool = getPool();
  const result = await pool.query(
    "update activity_intents set last_heartbeat = now() where id = $1 and status = 'active'",
    [intentId]
  );
  return { ok: true, active: (result.rowCount ?? 0) > 0 };
}

export async function cancelIntent(email: string, intentId: string): Promise<{ ok: boolean }> {
  const owned = await ownIntent(email, intentId);
  if (!owned) return { ok: false };
  await getPool().query("update activity_intents set status = 'cancelled' where id = $1 and status = 'active'", [intentId]);
  return { ok: true };
}

export async function setHidden(email: string, intentId: string, hidden: boolean): Promise<{ ok: boolean }> {
  const owned = await ownIntent(email, intentId);
  if (!owned) return { ok: false };
  await getPool().query("update activity_intents set hidden = $1 where id = $2", [hidden, intentId]);
  return { ok: true };
}

// ---------- Radar ----------

export type ConnectionState = "none" | "requested" | "incoming" | "connected";

export interface RadarPerson {
  userId: string;
  name: string;
  mode: "now" | "scheduled";
  startTime: string;
  approxDistanceKm: number;
  connection: ConnectionState;
  connectionId: string | null;
}

export interface RadarGroup {
  groupId: string;
  name: string;
  mode: "now" | "scheduled";
  startTime: string;
  memberCount: number;
  approxDistanceKm: number;
  joined: boolean;
}

export interface RadarResult {
  intent: {
    id: string;
    sport: string;
    mode: "now" | "scheduled";
    startTime: string;
    areaLabel: string | null;
    radiusKm: number;
    hidden: boolean;
    status: string;
  };
  now: RadarPerson[];
  scheduled: RadarPerson[];
  groups: RadarGroup[];
}

export async function radar(email: string, intentId: string): Promise<RadarResult | null> {
  const owned = await ownIntent(email, intentId);
  if (!owned) return null;
  await expireStale();
  const pool = getPool();

  const mine = await pool.query<{
    id: string;
    sport: string;
    mode: "now" | "scheduled";
    start_time: string;
    area_label: string | null;
    radius_km: number;
    hidden: boolean;
    status: string;
  }>(
    "select id, sport, mode, start_time, area_label, radius_km, hidden, status from activity_intents where id = $1",
    [intentId]
  );
  const intent = mine.rows[0];
  const base: RadarResult = {
    intent: {
      id: intent.id,
      sport: intent.sport,
      mode: intent.mode,
      startTime: intent.start_time,
      areaLabel: intent.area_label,
      radiusKm: intent.radius_km,
      hidden: intent.hidden,
      status: intent.status,
    },
    now: [],
    scheduled: [],
    groups: [],
  };
  if (intent.status !== "active") return base;

  const people = await pool.query<{
    user_id: string;
    name: string;
    mode: "now" | "scheduled";
    start_time: string;
    distance_km: number;
    conn_status: string | null;
    conn_requester: string | null;
    conn_id: string | null;
  }>(
    `select o.user_id, u.name, o.mode, ${SLOT_START("o")} as start_time,
            ${HAVERSINE_KM("me", "o")} as distance_km,
            conn.status as conn_status, conn.requester_id as conn_requester, conn.id as conn_id
     from activity_intents me
     join activity_intents o on o.sport = me.sport and o.user_id <> me.user_id
     join app_users u on u.id = o.user_id
     left join lateral (
       select c.id, c.status, c.requester_id from connections c
       where (c.requester_id = o.user_id and c.receiver_id = me.user_id)
          or (c.requester_id = me.user_id and c.receiver_id = o.user_id)
       limit 1
     ) conn on true
     where me.id = $1
       and o.status = 'active' and o.hidden = false
       and (conn.status is null or conn.status <> 'blocked')
       and ${HAVERSINE_KM("me", "o")} <= me.radius_km
       and ${SLOT_START("o")} < ${SLOT_START("me")} + interval '${SLOT_MINUTES} minutes'
       and ${SLOT_START("me")} < ${SLOT_START("o")} + interval '${SLOT_MINUTES} minutes'
     order by distance_km asc`,
    [intentId]
  );

  for (const row of people.rows) {
    let connection: ConnectionState = "none";
    if (row.conn_status === "accepted") connection = "connected";
    else if (row.conn_status === "pending") connection = row.conn_requester === owned.me.id ? "requested" : "incoming";
    const person: RadarPerson = {
      userId: row.user_id,
      name: row.name,
      mode: row.mode,
      startTime: row.start_time,
      approxDistanceKm: approxDistanceKm(Number(row.distance_km)),
      connection,
      connectionId: row.conn_status === "accepted" ? row.conn_id : null,
    };
    (row.mode === "now" ? base.now : base.scheduled).push(person);
  }

  const groups = await pool.query<{
    id: string;
    name: string;
    mode: "now" | "scheduled";
    start_time: string;
    distance_km: number;
    member_count: string;
    joined: boolean;
  }>(
    `select g.id, g.name, g.mode, g.start_time,
            ${HAVERSINE_KM("me", "g")} as distance_km,
            (select count(*) from group_members gm where gm.group_id = g.id) as member_count,
            exists (select 1 from group_members gm where gm.group_id = g.id and gm.user_id = me.user_id) as joined
     from activity_intents me
     join groups g on g.sport = me.sport
     where me.id = $1
       and g.status = 'active'
       and ${HAVERSINE_KM("me", "g")} <= me.radius_km
       and (case when g.mode = 'now' then now() else g.start_time end) < ${SLOT_START("me")} + interval '${SLOT_MINUTES} minutes'
       and ${SLOT_START("me")} < (case when g.mode = 'now' then now() else g.start_time end) + interval '${SLOT_MINUTES} minutes'
     order by distance_km asc`,
    [intentId]
  );

  base.groups = groups.rows.map((g) => ({
    groupId: g.id,
    name: g.name,
    mode: g.mode,
    startTime: g.start_time,
    memberCount: Number(g.member_count),
    approxDistanceKm: approxDistanceKm(Number(g.distance_km)),
    joined: g.joined,
  }));

  return base;
}

/** A radar request is a normal connection request tagged with the activity it came from. */
export async function sendRadarRequest(
  email: string,
  name: string,
  intentId: string,
  toUserId: string
): Promise<SendRequestResult | { ok: false; reason: "not_on_radar" }> {
  const owned = await ownIntent(email, intentId);
  if (!owned || owned.status !== "active") return { ok: false, reason: "not_on_radar" };
  await getOrCreateIdentity(email, name);
  const target = await getUserRowById(toUserId);
  if (!target) return { ok: false, reason: "not_found" };

  // Only people who are actually visible on your radar can be requested from here.
  const visible = await getPool().query(
    `select 1 from activity_intents me
     join activity_intents o on o.sport = me.sport and o.user_id = $2
     where me.id = $1 and o.status = 'active' and o.hidden = false`,
    [intentId, target.id]
  );
  if (visible.rows.length === 0) return { ok: false, reason: "not_on_radar" };

  return createConnectionRequest(owned.me, target, { source: "find_a_friend", activityId: intentId });
}

// ---------- Groups ----------

export async function createGroup(email: string, intentId: string, name: string): Promise<{ ok: true; groupId: string } | { ok: false; error: string }> {
  const trimmed = name.trim().slice(0, 60);
  if (!trimmed) return { ok: false, error: "Give the group a name" };
  const owned = await ownIntent(email, intentId);
  if (!owned || owned.status !== "active") return { ok: false, error: "Your search has ended — start a new one" };
  const pool = getPool();
  const created = await pool.query<{ id: string }>(
    `insert into groups (name, sport, area_geohash, area_lat, area_lng, mode, start_time, created_by)
     select $1, sport, area_geohash, area_lat, area_lng, mode, start_time, user_id from activity_intents where id = $2
     returning id`,
    [trimmed, intentId]
  );
  const groupId = created.rows[0].id;
  await pool.query("insert into group_members (group_id, user_id) values ($1, $2) on conflict do nothing", [groupId, owned.me.id]);
  return { ok: true, groupId };
}

export async function joinGroup(email: string, groupId: string): Promise<{ ok: boolean }> {
  if (!isUuid(groupId)) return { ok: false };
  const me = await getUserRowByEmail(email);
  if (!me) return { ok: false };
  const pool = getPool();
  const group = await pool.query("select 1 from groups where id = $1 and status = 'active'", [groupId]);
  if (group.rows.length === 0) return { ok: false };
  await pool.query("insert into group_members (group_id, user_id) values ($1, $2) on conflict do nothing", [groupId, me.id]);
  return { ok: true };
}

async function groupMember(email: string, groupId: string): Promise<UserRow | null> {
  if (!isUuid(groupId)) return null;
  const me = await getUserRowByEmail(email);
  if (!me) return null;
  const result = await getPool().query("select 1 from group_members where group_id = $1 and user_id = $2", [groupId, me.id]);
  return result.rows.length > 0 ? me : null;
}

export interface GroupSummary {
  groupId: string;
  name: string;
  sport: string;
  mode: "now" | "scheduled";
  startTime: string;
  memberCount: number;
  lastMessage: string | null;
}

export async function listMyGroups(email: string): Promise<GroupSummary[]> {
  const me = await getUserRowByEmail(email);
  if (!me) return [];
  const result = await getPool().query<{
    id: string;
    name: string;
    sport: string;
    mode: "now" | "scheduled";
    start_time: string;
    member_count: string;
    last_message: string | null;
  }>(
    `select g.id, g.name, g.sport, g.mode, g.start_time,
            (select count(*) from group_members x where x.group_id = g.id) as member_count,
            (select body from messages m where m.group_id = g.id order by m.created_at desc limit 1) as last_message
     from groups g join group_members gm on gm.group_id = g.id
     where gm.user_id = $1
     order by g.created_at desc`,
    [me.id]
  );
  return result.rows.map((g) => ({
    groupId: g.id,
    name: g.name,
    sport: g.sport,
    mode: g.mode,
    startTime: g.start_time,
    memberCount: Number(g.member_count),
    lastMessage: g.last_message,
  }));
}

export interface GroupChat {
  group: { id: string; name: string; sport: string; mode: "now" | "scheduled"; startTime: string; members: string[] };
  messages: { id: string; senderName: string; body: string; createdAt: string; mine: boolean }[];
}

export async function getGroupChat(email: string, groupId: string): Promise<GroupChat | null> {
  const me = await groupMember(email, groupId);
  if (!me) return null;
  const pool = getPool();
  const group = await pool.query<{ id: string; name: string; sport: string; mode: "now" | "scheduled"; start_time: string }>(
    "select id, name, sport, mode, start_time from groups where id = $1",
    [groupId]
  );
  const members = await pool.query<{ name: string }>(
    "select u.name from group_members gm join app_users u on u.id = gm.user_id where gm.group_id = $1 order by gm.joined_at",
    [groupId]
  );
  const messages = await pool.query<{ id: string; name: string; sender_id: string; body: string; created_at: string }>(
    `select m.id, u.name, m.sender_id, m.body, m.created_at from messages m
     join app_users u on u.id = m.sender_id
     where m.group_id = $1 order by m.created_at asc`,
    [groupId]
  );
  const g = group.rows[0];
  return {
    group: { id: g.id, name: g.name, sport: g.sport, mode: g.mode, startTime: g.start_time, members: members.rows.map((m) => m.name) },
    messages: messages.rows.map((m) => ({
      id: m.id,
      senderName: m.name,
      body: m.body,
      createdAt: m.created_at,
      mine: m.sender_id === me.id,
    })),
  };
}

export async function sendGroupMessage(email: string, groupId: string, body: string): Promise<{ ok: boolean }> {
  if (!body.trim()) return { ok: false };
  const me = await groupMember(email, groupId);
  if (!me) return { ok: false };
  await getPool().query("insert into messages (group_id, sender_id, body) values ($1, $2, $3)", [groupId, me.id, body.trim().slice(0, 2000)]);
  return { ok: true };
}

// ---------- Safety ----------

/** Blocking hides both people from each other's radar and stops their chat. */
export async function blockUser(email: string, targetUserId: string): Promise<{ ok: boolean }> {
  const me = await getUserRowByEmail(email);
  const target = await getUserRowById(targetUserId);
  if (!me || !target || me.id === target.id) return { ok: false };
  const pool = getPool();
  const existing = await pool.query<{ id: string }>(
    `select id from connections
     where (requester_id = $1 and receiver_id = $2) or (requester_id = $2 and receiver_id = $1)`,
    [me.id, target.id]
  );
  if (existing.rows[0]) {
    await pool.query(
      "update connections set status = 'blocked', requester_id = $1, receiver_id = $2 where id = $3",
      [me.id, target.id, existing.rows[0].id]
    );
  } else {
    await pool.query("insert into connections (requester_id, receiver_id, status) values ($1, $2, 'blocked')", [me.id, target.id]);
  }
  return { ok: true };
}

export async function reportUser(email: string, targetUserId: string, reason: string): Promise<{ ok: boolean }> {
  const me = await getUserRowByEmail(email);
  const target = await getUserRowById(targetUserId);
  if (!me || !target || me.id === target.id) return { ok: false };
  await getPool().query("insert into reports (reporter_id, reported_id, reason) values ($1, $2, $3)", [
    me.id,
    target.id,
    reason.trim().slice(0, 500) || "No reason given",
  ]);
  return blockUser(email, targetUserId);
}
