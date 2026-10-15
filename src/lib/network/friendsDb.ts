import { randomInt } from "node:crypto";
import { getPool } from "@/lib/db";

/** What other people see about a user: never their email. */
export interface NetworkUser {
  name: string;
  code: string;
}

/** Shown about people you're connected with: their photo (friends can always see it) and ✓ badge. */
export interface TrustInfo {
  photoId: string | null;
  verified: boolean;
}

export interface UserRow extends NetworkUser {
  id: string;
  email: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars: no I, O, 0, 1

function generateCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return `SB-${code}`;
}

export async function getUserRowByEmail(email: string): Promise<UserRow | null> {
  const pool = getPool();
  const result = await pool.query<UserRow>("select id, email, name, code from app_users where email = $1", [email]);
  return result.rows[0] ?? null;
}

export async function getUserRowById(id: string): Promise<UserRow | null> {
  if (!isUuid(id)) return null;
  const pool = getPool();
  const result = await pool.query<UserRow>("select id, email, name, code from app_users where id = $1", [id]);
  return result.rows[0] ?? null;
}

/** Looks up or creates this email's real, cross-device identity. */
export async function getOrCreateIdentity(email: string, name: string): Promise<NetworkUser> {
  const pool = getPool();
  const existing = await getUserRowByEmail(email);
  if (existing) return existing;

  // Retry on the rare code collision (unique constraint on `code`).
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const code = generateCode();
      const inserted = await pool.query<NetworkUser>(
        "insert into app_users (email, name, code) values ($1, $2, $3) returning name, code",
        [email, name, code]
      );
      return inserted.rows[0];
    } catch (err) {
      const conflictOnEmail = (err as { constraint?: string }).constraint === "app_users_email_key";
      if (conflictOnEmail) {
        // Someone else's concurrent request created it first — just read it back.
        const raced = await getUserRowByEmail(email);
        if (raced) return raced;
      }
      if (attempt === 4) throw err;
    }
  }
  throw new Error("Could not create a unique friend code after 5 attempts");
}

async function lookupByCode(code: string): Promise<UserRow | null> {
  const pool = getPool();
  const result = await pool.query<UserRow>(
    "select id, email, name, code from app_users where code = $1",
    [code.trim().toUpperCase()]
  );
  return result.rows[0] ?? null;
}

export type ConnectionSource = "search" | "find_a_friend";

export type SendRequestResult =
  | { ok: true; connectionId: string }
  | { ok: false; reason: "self" | "not_found" | "already_friends" | "already_pending" };

/** Shared by Add-by-code and Find a Friend: there is one connection row per pair of users. */
export async function createConnectionRequest(
  requester: UserRow,
  receiver: UserRow,
  options?: { source?: ConnectionSource; activityId?: string | null }
): Promise<SendRequestResult> {
  if (receiver.id === requester.id) return { ok: false, reason: "self" };
  const pool = getPool();

  const existing = await pool.query<{ id: string; status: string }>(
    `select id, status from connections
     where (requester_id = $1 and receiver_id = $2) or (requester_id = $2 and receiver_id = $1)`,
    [requester.id, receiver.id]
  );
  const current = existing.rows[0];
  if (current?.status === "accepted") return { ok: false, reason: "already_friends" };
  if (current?.status === "pending") return { ok: false, reason: "already_pending" };
  // A block hides the two people from each other, so it reads as "not found" rather than revealing the block.
  if (current?.status === "blocked") return { ok: false, reason: "not_found" };

  const source = options?.source ?? "search";
  const activityId = options?.activityId ?? null;

  if (current) {
    // Declined earlier: a fresh request is allowed.
    await pool.query(
      `update connections
       set status = 'pending', created_at = now(), requester_id = $1, receiver_id = $2,
           source = $3, activity_id = $4, proposed_time = null
       where id = $5`,
      [requester.id, receiver.id, source, activityId, current.id]
    );
    return { ok: true, connectionId: current.id };
  }

  const inserted = await pool.query<{ id: string }>(
    "insert into connections (requester_id, receiver_id, source, activity_id) values ($1, $2, $3, $4) returning id",
    [requester.id, receiver.id, source, activityId]
  );
  return { ok: true, connectionId: inserted.rows[0].id };
}

export async function sendFriendRequest(
  fromEmail: string,
  fromName: string,
  toCode: string,
  options?: { source?: ConnectionSource; activityId?: string | null }
): Promise<SendRequestResult> {
  await getOrCreateIdentity(fromEmail, fromName); // ensure the sender has a row too
  const requester = await getUserRowByEmail(fromEmail);
  const receiver = await lookupByCode(toCode);
  if (!requester || !receiver) return { ok: false, reason: "not_found" };
  return createConnectionRequest(requester, receiver, options);
}

export type RespondAction = "accepted" | "declined" | "blocked" | "join_their_time" | "suggest";

export async function respondToRequest(
  requestId: string,
  respondingEmail: string,
  action: RespondAction,
  proposedTime?: string
): Promise<{ ok: boolean }> {
  if (!isUuid(requestId)) return { ok: false };
  const pool = getPool();
  const responder = await getUserRowByEmail(respondingEmail);
  if (!responder) return { ok: false };

  if (action === "suggest") {
    const time = proposedTime ? new Date(proposedTime) : null;
    if (!time || Number.isNaN(time.getTime()) || time.getTime() < Date.now() - 5 * 60_000) return { ok: false };
    // Hand the request back to the original requester, now carrying the new time.
    const result = await pool.query(
      `update connections
       set requester_id = receiver_id, receiver_id = requester_id, proposed_time = $1, created_at = now()
       where id = $2 and receiver_id = $3 and status = 'pending'`,
      [time.toISOString(), requestId, responder.id]
    );
    return { ok: (result.rowCount ?? 0) > 0 };
  }

  const status = action === "join_their_time" ? "accepted" : action;
  const result = await pool.query(
    "update connections set status = $1 where id = $2 and receiver_id = $3 and status = 'pending'",
    [status, requestId, responder.id]
  );
  return { ok: (result.rowCount ?? 0) > 0 };
}

export interface IncomingRequest {
  id: string;
  from: NetworkUser & { verified: boolean };
  createdAt: string;
  source: ConnectionSource;
  activity: { sport: string; mode: "now" | "scheduled"; startTime: string; areaLabel: string | null } | null;
  proposedTime: string | null;
  /** The receiver already has a live plan for this sport, so a plain Accept/Decline is enough. */
  hasMatchingSchedule: boolean;
}

export interface FriendsList {
  friends: (NetworkUser & TrustInfo & { connectionId: string })[];
  incoming: IncomingRequest[];
  outgoing: { id: string; to: NetworkUser; createdAt: string }[];
  totalUnread: number;
}

export async function listFriends(email: string): Promise<FriendsList> {
  const pool = getPool();
  const me = await getUserRowByEmail(email);
  if (!me) return { friends: [], incoming: [], outgoing: [], totalUnread: 0 };

  const friends = await pool.query<NetworkUser & { connection_id: string; photo_id: string | null; verified: boolean }>(
    `select u.name, u.code, c.id as connection_id, ph.id as photo_id, u.verified_at is not null as verified from connections c
     join app_users u on u.id = (case when c.requester_id = $1 then c.receiver_id else c.requester_id end)
     left join profile_photos ph on ph.user_id = u.id
     where c.status = 'accepted' and (c.requester_id = $1 or c.receiver_id = $1)`,
    [me.id]
  );

  const incoming = await pool.query<{
    id: string;
    name: string;
    code: string;
    created_at: string;
    source: ConnectionSource;
    proposed_time: string | null;
    sport: string | null;
    mode: "now" | "scheduled" | null;
    start_time: string | null;
    area_label: string | null;
    has_matching_schedule: boolean;
    verified: boolean;
  }>(
    `select c.id, u.name, u.code, c.created_at, c.source, c.proposed_time, u.verified_at is not null as verified,
            ai.sport, ai.mode, ai.start_time, ai.area_label,
            exists (
              select 1 from activity_intents mine
              where mine.user_id = $1 and mine.status = 'active' and mine.sport = ai.sport
                and ((mine.mode = 'now' and mine.last_heartbeat > now() - interval '90 seconds')
                  or (mine.mode = 'scheduled' and mine.start_time > now() - interval '60 minutes'))
            ) as has_matching_schedule
     from connections c
     join app_users u on u.id = c.requester_id
     left join activity_intents ai on ai.id = c.activity_id
     where c.receiver_id = $1 and c.status = 'pending'
     order by c.created_at desc`,
    [me.id]
  );

  const outgoing = await pool.query<{ id: string; name: string; code: string; created_at: string }>(
    `select c.id, u.name, u.code, c.created_at from connections c
     join app_users u on u.id = c.receiver_id
     where c.requester_id = $1 and c.status = 'pending'`,
    [me.id]
  );

  const unread = await pool.query<{ count: string }>(
    `select count(*) from messages m
     join connections c on c.id = m.connection_id
     where m.sender_id != $1 and m.read_at is null and (c.requester_id = $1 or c.receiver_id = $1)
       and (m.expires_at is null or m.expires_at > now())`,
    [me.id]
  );

  return {
    friends: friends.rows.map((r) => ({
      name: r.name,
      code: r.code,
      connectionId: r.connection_id,
      photoId: r.photo_id,
      verified: r.verified,
    })),
    incoming: incoming.rows.map((r) => ({
      id: r.id,
      from: { name: r.name, code: r.code, verified: r.verified },
      createdAt: r.created_at,
      source: r.source,
      activity:
        r.sport && r.mode && r.start_time
          ? { sport: r.sport, mode: r.mode, startTime: r.start_time, areaLabel: r.area_label }
          : null,
      proposedTime: r.proposed_time,
      hasMatchingSchedule: r.has_matching_schedule,
    })),
    outgoing: outgoing.rows.map((r) => ({ id: r.id, to: { name: r.name, code: r.code }, createdAt: r.created_at })),
    totalUnread: Number(unread.rows[0]?.count ?? 0),
  };
}

// ---------- Chat (unlocked only once a connection is accepted) ----------

export interface ConversationSummary {
  connectionId: string;
  with: NetworkUser & TrustInfo;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
}

export async function listConversations(email: string): Promise<ConversationSummary[]> {
  const pool = getPool();
  const me = await getUserRowByEmail(email);
  if (!me) return [];

  const result = await pool.query<{
    connection_id: string;
    name: string;
    code: string;
    photo_id: string | null;
    verified: boolean;
    last_message: string | null;
    last_message_at: string | null;
    unread_count: string;
  }>(
    `select
       c.id as connection_id,
       u.name, u.code, ph.id as photo_id, u.verified_at is not null as verified,
       case when lm.type = 'celebration' then 'Sent a celebration' else lm.body end as last_message,
       lm.created_at as last_message_at,
       (select count(*) from messages um where um.connection_id = c.id and um.sender_id != $1 and um.read_at is null
          and (um.expires_at is null or um.expires_at > now())) as unread_count
     from connections c
     join app_users u on u.id = (case when c.requester_id = $1 then c.receiver_id else c.requester_id end)
     left join profile_photos ph on ph.user_id = u.id
     left join lateral (
       select type, body, created_at from messages m
       where m.connection_id = c.id and (m.expires_at is null or m.expires_at > now())
       order by m.created_at desc, m.id desc limit 1
     ) lm on true
     where c.status = 'accepted' and (c.requester_id = $1 or c.receiver_id = $1)
     order by coalesce(lm.created_at, c.created_at) desc`,
    [me.id]
  );

  return result.rows.map((r) => ({
    connectionId: r.connection_id,
    with: { name: r.name, code: r.code, photoId: r.photo_id, verified: r.verified },
    lastMessage: r.last_message,
    lastMessageAt: r.last_message_at,
    unreadCount: Number(r.unread_count),
  }));
}

// ---------- Managing connections (by connection id, so other users' ids never reach the browser) ----------

/** The other person in a connection you're part of (any status), or null. */
export async function otherParticipantId(connectionId: string, userId: string): Promise<string | null> {
  if (!isUuid(connectionId)) return null;
  const result = await getPool().query<{ other: string }>(
    `select case when requester_id = $2 then receiver_id else requester_id end as other
     from connections where id = $1 and (requester_id = $2 or receiver_id = $2)`,
    [connectionId, userId]
  );
  return result.rows[0]?.other ?? null;
}

/**
 * Silently ends a friendship: the other person isn't notified, chat access
 * ends for both (the conversation is deleted with the connection), and either
 * can send a new request later.
 */
export async function removeFriend(connectionId: string, userId: string): Promise<boolean> {
  if (!isUuid(connectionId)) return false;
  const result = await getPool().query(
    "delete from connections where id = $1 and status = 'accepted' and (requester_id = $2 or receiver_id = $2)",
    [connectionId, userId]
  );
  return (result.rowCount ?? 0) > 0;
}

/** Withdraws a request you sent that hasn't been answered yet. */
export async function cancelSentRequest(connectionId: string, userId: string): Promise<boolean> {
  if (!isUuid(connectionId)) return false;
  const result = await getPool().query(
    "delete from connections where id = $1 and status = 'pending' and requester_id = $2",
    [connectionId, userId]
  );
  return (result.rowCount ?? 0) > 0;
}
