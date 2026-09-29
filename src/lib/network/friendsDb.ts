import { getPool } from "@/lib/db";

export interface NetworkUser {
  email: string;
  name: string;
  code: string;
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars: no I, O, 0, 1

function generateCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  return `SB-${code}`;
}

/** Looks up or creates this email's real, cross-device identity. */
export async function getOrCreateIdentity(email: string, name: string): Promise<NetworkUser> {
  const pool = getPool();
  const existing = await pool.query<NetworkUser>(
    "select email, name, code from app_users where email = $1",
    [email]
  );
  if (existing.rows[0]) return existing.rows[0];

  // Retry on the rare code collision (unique constraint on `code`).
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const code = generateCode();
      const inserted = await pool.query<NetworkUser>(
        "insert into app_users (email, name, code) values ($1, $2, $3) returning email, name, code",
        [email, name, code]
      );
      return inserted.rows[0];
    } catch (err) {
      const conflictOnEmail = (err as { constraint?: string }).constraint === "app_users_email_key";
      if (conflictOnEmail) {
        // Someone else's concurrent request created it first — just read it back.
        const raced = await pool.query<NetworkUser>(
          "select email, name, code from app_users where email = $1",
          [email]
        );
        if (raced.rows[0]) return raced.rows[0];
      }
      if (attempt === 4) throw err;
    }
  }
  throw new Error("Could not create a unique friend code after 5 attempts");
}

export async function lookupByCode(code: string): Promise<NetworkUser | null> {
  const pool = getPool();
  const result = await pool.query<NetworkUser>(
    "select email, name, code from app_users where code = $1",
    [code.trim().toUpperCase()]
  );
  return result.rows[0] ?? null;
}

export type SendRequestResult =
  | { ok: true }
  | { ok: false; reason: "self" | "not_found" | "already_friends" | "already_pending" };

export async function sendFriendRequest(fromEmail: string, fromName: string, toCode: string): Promise<SendRequestResult> {
  const pool = getPool();
  await getOrCreateIdentity(fromEmail, fromName); // ensure the sender has a row too

  const receiver = await lookupByCode(toCode);
  if (!receiver) return { ok: false, reason: "not_found" };
  if (receiver.email === fromEmail) return { ok: false, reason: "self" };

  const existing = await pool.query<{ status: string }>(
    `select status from friend_requests
     where (requester_email = $1 and receiver_email = $2) or (requester_email = $2 and receiver_email = $1)`,
    [fromEmail, receiver.email]
  );
  const current = existing.rows[0]?.status;
  if (current === "accepted") return { ok: false, reason: "already_friends" };
  if (current === "pending") return { ok: false, reason: "already_pending" };

  if (current === "declined") {
    await pool.query(
      `update friend_requests set status = 'pending', created_at = now(), requester_email = $1, receiver_email = $2
       where (requester_email = $1 and receiver_email = $2) or (requester_email = $2 and receiver_email = $1)`,
      [fromEmail, receiver.email]
    );
  } else {
    await pool.query(
      "insert into friend_requests (requester_email, receiver_email) values ($1, $2)",
      [fromEmail, receiver.email]
    );
  }
  return { ok: true };
}

export async function respondToRequest(
  requestId: string,
  respondingEmail: string,
  status: "accepted" | "declined"
): Promise<{ ok: boolean }> {
  const pool = getPool();
  const result = await pool.query(
    "update friend_requests set status = $1 where id = $2 and receiver_email = $3 and status = 'pending'",
    [status, requestId, respondingEmail]
  );
  return { ok: (result.rowCount ?? 0) > 0 };
}

export interface FriendsList {
  friends: NetworkUser[];
  incoming: { id: string; from: NetworkUser; createdAt: string }[];
  outgoing: { id: string; to: NetworkUser; createdAt: string }[];
}

export async function listFriends(email: string): Promise<FriendsList> {
  const pool = getPool();

  const friends = await pool.query<NetworkUser>(
    `select u.email, u.name, u.code from friend_requests r
     join app_users u on u.email = (case when r.requester_email = $1 then r.receiver_email else r.requester_email end)
     where r.status = 'accepted' and (r.requester_email = $1 or r.receiver_email = $1)`,
    [email]
  );

  const incoming = await pool.query<{ id: string; email: string; name: string; code: string; created_at: string }>(
    `select r.id, u.email, u.name, u.code, r.created_at from friend_requests r
     join app_users u on u.email = r.requester_email
     where r.receiver_email = $1 and r.status = 'pending'`,
    [email]
  );

  const outgoing = await pool.query<{ id: string; email: string; name: string; code: string; created_at: string }>(
    `select r.id, u.email, u.name, u.code, r.created_at from friend_requests r
     join app_users u on u.email = r.receiver_email
     where r.requester_email = $1 and r.status = 'pending'`,
    [email]
  );

  return {
    friends: friends.rows,
    incoming: incoming.rows.map((r) => ({ id: r.id, from: { email: r.email, name: r.name, code: r.code }, createdAt: r.created_at })),
    outgoing: outgoing.rows.map((r) => ({ id: r.id, to: { email: r.email, name: r.name, code: r.code }, createdAt: r.created_at })),
  };
}
