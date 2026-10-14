/**
 * Helpers for API tests that run against a real build of the app.
 * Needs: TEST_BASE_URL (default http://localhost:3100), TEST_MAIL_LOG (the
 * smtp-sink output file) and TEST_DATABASE_URL. See tests/README.md.
 */
import fs from "node:fs";
import { randomUUID } from "node:crypto";
import pg from "pg";

export const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3100";
const MAIL_LOG = process.env.TEST_MAIL_LOG ?? "";

export const db = new pg.Pool({
  connectionString: process.env.TEST_DATABASE_URL ?? "postgres://localhost:5432/togetherfit_dev",
  ssl: process.env.TEST_DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false,
});

export const PASSWORD = "Testpass123";

export interface Res<T = Record<string, unknown>> {
  status: number;
  body: T & { ok?: boolean; error?: string };
}

/** A signed-in (or not) browser: keeps the session cookie between requests. */
export class Client {
  cookie: string | null = null;
  email = "";
  name = "";

  async req<T = Record<string, unknown>>(method: string, path: string, body?: unknown, headers: Record<string, string> = {}): Promise<Res<T>> {
    const res = await fetch(BASE + path, {
      method,
      redirect: "manual",
      headers: {
        ...(body !== undefined ? { "content-type": "application/json" } : {}),
        ...(method !== "GET" ? { origin: BASE } : {}),
        ...(this.cookie ? { cookie: `tf_session=${this.cookie}` } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const setCookie = res.headers.get("set-cookie");
    const match = setCookie?.match(/tf_session=([^;]*)/);
    if (match) this.cookie = match[1] || null;
    const text = await res.text();
    let parsed: unknown = {};
    try {
      parsed = text ? JSON.parse(text) : {};
    } catch {
      parsed = { raw: text };
    }
    return { status: res.status, body: parsed as Res<T>["body"] };
  }

  get = <T = Record<string, unknown>>(path: string) => this.req<T>("GET", path);
  post = <T = Record<string, unknown>>(path: string, body: unknown = {}) => this.req<T>("POST", path, body);
}

export function uniqueEmail(prefix = "t"): string {
  return `${prefix}-${randomUUID().slice(0, 12)}@example.com`;
}

/** The newest 6-digit code emailed to `email` (waits briefly for delivery). */
export async function codeFor(email: string, afterCount = 0): Promise<string> {
  if (!MAIL_LOG) throw new Error("TEST_MAIL_LOG is not set");
  for (let i = 0; i < 40; i++) {
    const messages = fs
      .readFileSync(MAIL_LOG, "utf8")
      .split("=====END=====")
      .filter((m) => m.includes(`To: ${email}`));
    if (messages.length > afterCount) {
      const text = messages[messages.length - 1].split(/\n\n/).slice(1).join("\n");
      const code = text.match(/\b(\d{6})\b/)?.[1];
      if (code) return code;
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error(`No code arrived for ${email}`);
}

export function mailCount(email: string): number {
  if (!MAIL_LOG) return 0;
  return fs.readFileSync(MAIL_LOG, "utf8").split("=====END=====").filter((m) => m.includes(`To: ${email}`)).length;
}

/** Signs up a fresh account through the real email-code flow and finishes onboarding. */
export async function signUp(name = "Test User"): Promise<Client> {
  const c = new Client();
  c.email = uniqueEmail();
  c.name = name;
  const start = await c.post<{ challengeId: string }>("/api/auth/signup", { email: c.email, name, password: PASSWORD });
  if (start.status !== 200) throw new Error(`signup failed: ${start.status} ${JSON.stringify(start.body)}`);
  const code = await codeFor(c.email);
  const verified = await c.post("/api/auth/verify", { purpose: "signup", challengeId: start.body.challengeId, code });
  if (verified.status !== 200) throw new Error(`verify failed: ${verified.status} ${JSON.stringify(verified.body)}`);
  await c.post("/api/auth/onboarding", { wellnessSetup: {} });
  return c;
}

/** Signs in an existing account (password + emailed code) as a new client. */
export async function logIn(email: string, password = PASSWORD): Promise<Client> {
  const c = new Client();
  c.email = email;
  const before = mailCount(email);
  const start = await c.post<{ challengeId: string }>("/api/auth/login", { email, password });
  if (start.status !== 200) throw new Error(`login failed: ${start.status}`);
  const code = await codeFor(email, before);
  await c.post("/api/auth/verify", { purpose: "login", challengeId: start.body.challengeId, code });
  return c;
}

export async function clearRateLimits() {
  await db.query("delete from rate_limits");
}

export async function userId(c: Client): Promise<string> {
  return (await db.query("select id from app_users where email = $1", [c.email])).rows[0].id;
}

/** A group with the given members, created directly (the radar flow is tested elsewhere). */
export async function makeGroup(owner: Client, ...members: Client[]): Promise<string> {
  const created = await db.query(
    `insert into groups (name, sport, area_geohash, area_lat, area_lng, mode, start_time, created_by)
     values ('Morning runners', 'running', 'tdr1y', 12.97, 77.59, 'now', now(), $1) returning id`,
    [await userId(owner)]
  );
  const id: string = created.rows[0].id;
  for (const c of [owner, ...members]) {
    await db.query("insert into group_members (group_id, user_id) values ($1, $2)", [id, await userId(c)]);
  }
  return id;
}
