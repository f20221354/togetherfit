import { getPool } from "@/lib/db";
import { isUuid } from "./friendsDb";

/**
 * 1:1 chat between friends. Postgres is the source of truth; the realtime
 * service only tells browsers "something changed", and they fetch the change
 * from here. Every function checks the user is in an *accepted* connection.
 */

export interface ChatMessage {
  id: string;
  type: "text" | "celebration";
  body: string;
  createdAt: string;
  updatedAt: string;
  mine: boolean;
  /** Celebration cards disappear after 24h; the receiver can react once. */
  expiresAt: string | null;
  reaction: string | null;
  /** Only on your own messages: lets the browser match its optimistic copy. */
  clientMessageId: string | null;
  /** Opaque "load older than this" cursor, with Postgres's full microsecond precision. */
  cursor: string;
}

export const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;
/** "Changed since" looks back a little further, so a slow concurrent write can't slip between two syncs. */
const SYNC_OVERLAP_SECONDS = 5;
/** More changes than this since the last sync → the browser reloads the latest page instead. */
const SYNC_LIMIT = 200;

const VISIBLE = "(m.expires_at is null or m.expires_at > now())";
const COLUMNS =
  "m.id, m.sender_id, m.type, m.body, m.created_at, m.created_at::text as created_at_exact, m.updated_at, m.expires_at, m.reaction, m.client_message_id";

interface MessageRow {
  id: string;
  sender_id: string;
  type: "text" | "celebration";
  body: string;
  created_at: Date;
  created_at_exact: string;
  updated_at: Date;
  expires_at: Date | null;
  reaction: string | null;
  client_message_id: string | null;
}

function toMessage(r: MessageRow, userId: string): ChatMessage {
  const mine = r.sender_id === userId;
  return {
    id: r.id,
    type: r.type,
    body: r.body,
    createdAt: r.created_at.toISOString(),
    updatedAt: r.updated_at.toISOString(),
    mine,
    expiresAt: r.expires_at?.toISOString() ?? null,
    reaction: r.reaction,
    clientMessageId: mine ? r.client_message_id : null,
    cursor: `${r.created_at_exact}|${r.id}`,
  };
}

/** Both user ids of an accepted connection, if `userId` is one of them; otherwise null. */
export async function participantIds(connectionId: string, userId: string): Promise<string[] | null> {
  if (!isUuid(connectionId)) return null;
  const result = await getPool().query<{ requester_id: string; receiver_id: string }>(
    "select requester_id, receiver_id from connections where id = $1 and status = 'accepted' and (requester_id = $2 or receiver_id = $2)",
    [connectionId, userId]
  );
  const row = result.rows[0];
  return row ? [row.requester_id, row.receiver_id] : null;
}

/** Both user ids of a connection, for notifying them after a change that was already authorized. */
export async function connectionUserIds(connectionId: string): Promise<string[]> {
  const result = await getPool().query<{ requester_id: string; receiver_id: string }>(
    "select requester_id, receiver_id from connections where id = $1",
    [connectionId]
  );
  const row = result.rows[0];
  return row ? [row.requester_id, row.receiver_id] : [];
}

async function dbNow(): Promise<string> {
  const result = await getPool().query<{ now: Date }>("select now()");
  return result.rows[0].now.toISOString();
}

/** Page cursors are the `cursor` of the oldest message the browser already has. */
const PG_TIMESTAMP = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(\.\d{1,6})?([+-]\d{2}(:?\d{2})?|Z)?$/;

function parseBefore(before: string): { createdAt: string; id: string } | null {
  const [createdAt, id] = before.split("|");
  return createdAt && PG_TIMESTAMP.test(createdAt) && isUuid(id) ? { createdAt, id } : null;
}

/** Who you're talking to, shown in the chat header (friends can always see each other's photo). */
export interface ChatPartner {
  name: string;
  photoId: string | null;
  verified: boolean;
}

export type PageResult =
  | { ok: true; messages: ChatMessage[]; hasMore: boolean; syncCursor: string; partner?: ChatPartner }
  | { ok: false; reason: "not_a_participant" | "bad_cursor" };

/**
 * The newest `limit` messages, or the `limit` messages just before `before`.
 * `syncCursor` is where the browser should start asking for changes.
 */
export async function getMessagePage(
  connectionId: string,
  userId: string,
  options: { before?: string | null; limit?: number } = {}
): Promise<PageResult> {
  if (!(await participantIds(connectionId, userId))) return { ok: false, reason: "not_a_participant" };
  const limit = Math.min(Math.max(options.limit ?? DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);
  const before = options.before ? parseBefore(options.before) : null;
  if (options.before && !before) return { ok: false, reason: "bad_cursor" };

  // Taken before the read, so nothing written during it is missed by the next sync.
  const syncCursor = await dbNow();
  const params: unknown[] = [connectionId, limit + 1];
  let keyset = "";
  if (before) {
    params.push(before.createdAt, before.id);
    keyset = "and (m.created_at, m.id) < ($3::timestamptz, $4::uuid)";
  }
  const result = await getPool().query<MessageRow>(
    `select ${COLUMNS} from messages m
     where m.connection_id = $1 and ${VISIBLE} ${keyset}
     order by m.created_at desc, m.id desc
     limit $2`,
    params
  );
  const rows = result.rows.slice(0, limit).reverse();
  const page = { messages: rows.map((r) => toMessage(r, userId)), hasMore: result.rows.length > limit, syncCursor };
  if (before) return { ok: true, ...page };
  // First page: also say who this is with.
  const partner = await getPool().query<{ name: string; photo_id: string | null; verified: boolean }>(
    `select u.name, p.id as photo_id, u.verified_at is not null as verified
     from connections c
     join app_users u on u.id = case when c.requester_id = $2 then c.receiver_id else c.requester_id end
     left join profile_photos p on p.user_id = u.id
     where c.id = $1`,
    [connectionId, userId]
  );
  const r = partner.rows[0];
  return { ok: true, ...page, partner: r ? { name: r.name, photoId: r.photo_id, verified: r.verified } : undefined };
}

export type SyncResult =
  | { ok: true; messages: ChatMessage[]; syncCursor: string; reset: boolean }
  | { ok: false; reason: "not_a_participant" | "bad_cursor" };

/** Messages created or changed (e.g. a reaction) since `since`: used for live updates and after reconnecting. */
export async function getMessagesSince(connectionId: string, userId: string, since: string): Promise<SyncResult> {
  if (Number.isNaN(Date.parse(since))) return { ok: false, reason: "bad_cursor" };
  if (!(await participantIds(connectionId, userId))) return { ok: false, reason: "not_a_participant" };

  const syncCursor = await dbNow();
  const result = await getPool().query<MessageRow>(
    `select ${COLUMNS} from messages m
     where m.connection_id = $1 and ${VISIBLE}
       and m.updated_at > $2::timestamptz - make_interval(secs => $3)
     order by m.updated_at, m.id
     limit $4`,
    [connectionId, since, SYNC_OVERLAP_SECONDS, SYNC_LIMIT + 1]
  );
  if (result.rows.length > SYNC_LIMIT) return { ok: true, messages: [], syncCursor, reset: true };
  return { ok: true, messages: result.rows.map((r) => toMessage(r, userId)), syncCursor, reset: false };
}

export type SendResult =
  | { ok: true; message: ChatMessage; participants: string[] }
  | { ok: false; reason: "not_a_participant" | "empty" };

/**
 * Saves a text message. Sending again with the same `clientMessageId` (a
 * retry after a network error) returns the first copy instead of a duplicate.
 */
export async function sendChatMessage(
  connectionId: string,
  userId: string,
  body: string,
  clientMessageId: string | null
): Promise<SendResult> {
  const text = body.trim();
  if (!text) return { ok: false, reason: "empty" };
  const participants = await participantIds(connectionId, userId);
  if (!participants) return { ok: false, reason: "not_a_participant" };

  const pool = getPool();
  const inserted = await pool.query<MessageRow>(
    `insert into messages (connection_id, sender_id, type, body, client_message_id)
     values ($1, $2, 'text', $3, $4)
     on conflict (sender_id, client_message_id) where client_message_id is not null do nothing
     returning id, sender_id, type, body, created_at, created_at::text as created_at_exact, updated_at, expires_at, reaction, client_message_id`,
    [connectionId, userId, text, clientMessageId]
  );
  let row = inserted.rows[0];
  if (!row) {
    const existing = await pool.query<MessageRow>(
      `select ${COLUMNS} from messages m where m.sender_id = $1 and m.client_message_id = $2 and m.connection_id = $3`,
      [userId, clientMessageId, connectionId]
    );
    row = existing.rows[0];
    if (!row) return { ok: false, reason: "not_a_participant" }; // same id reused for another conversation
  }
  return { ok: true, message: toMessage(row, userId), participants };
}

/** Marks the other person's messages in this conversation as read. */
export async function markConversationRead(connectionId: string, userId: string): Promise<boolean> {
  if (!(await participantIds(connectionId, userId))) return false;
  await getPool().query(
    "update messages set read_at = now() where connection_id = $1 and sender_id != $2 and read_at is null",
    [connectionId, userId]
  );
  return true;
}

/** Physically removes expired celebration cards. Reads already hide them, so this only needs to run occasionally. */
export async function deleteExpiredMessages(): Promise<number> {
  const result = await getPool().query("delete from messages where expires_at is not null and expires_at <= now()");
  return result.rowCount ?? 0;
}
