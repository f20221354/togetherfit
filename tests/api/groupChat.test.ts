import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { Client, clearRateLimits, db, makeGroup, signUp } from "./helpers";

beforeAll(clearRateLimits);
afterAll(() => db.end());

interface Msg {
  id: string;
  body: string;
  mine: boolean;
  senderName: string;
  cursor: string;
  clientMessageId: string | null;
}
interface Page {
  ok: boolean;
  messages: Msg[];
  hasMore: boolean;
  syncCursor: string;
  group?: { name: string; members: string[] };
}

describe("group chat", () => {
  it("is members only, with names, pages, changes since, and duplicate-safe sends", async () => {
    const a = await signUp("Asha Runner");
    const b = await signUp("Bilal Runner");
    const outsider = await signUp("Out Sider");
    const groupId = await makeGroup(a, b);
    const url = `/api/groups/${groupId}/messages`;

    expect((await outsider.get(url)).status).toBe(403);
    expect((await outsider.post(url, { body: "let me in" })).status).toBe(403);
    expect((await new Client().get(url)).status).toBe(401);

    const first = await a.get<Page>(url);
    expect(first.status).toBe(200);
    expect(first.body.messages).toEqual([]);
    expect(first.body.group?.name).toBe("Morning runners");
    expect(first.body.group?.members).toHaveLength(2);

    const clientMessageId = randomUUID();
    const sent = await a.post<{ message: Msg }>(url, { body: "  Who's in at 6?  ", clientMessageId });
    expect(sent.status).toBe(200);
    expect(sent.body.message.body).toBe("Who's in at 6?");
    const again = await a.post<{ message: Msg }>(url, { body: "Who's in at 6?", clientMessageId });
    expect(again.body.message.id).toBe(sent.body.message.id);

    const changes = await b.get<Page>(`${url}?since=${encodeURIComponent(first.body.syncCursor)}`);
    expect(changes.body.messages).toHaveLength(1);
    expect(changes.body.messages[0]).toMatchObject({ mine: false, senderName: "Asha Runner", clientMessageId: null });
    expect(changes.body.group).toBeUndefined();

    for (let i = 0; i < 4; i++) await b.post(url, { body: `reply ${i}` });
    const latest = await a.get<Page>(`${url}?limit=3`);
    expect(latest.body.messages.map((m) => m.body)).toEqual(["reply 1", "reply 2", "reply 3"]);
    expect(latest.body.hasMore).toBe(true);
    const older = await a.get<Page>(`${url}?limit=3&before=${encodeURIComponent(latest.body.messages[0].cursor)}`);
    expect(older.body.messages.map((m) => m.body)).toEqual(["Who's in at 6?", "reply 0"]);
    expect(older.body.hasMore).toBe(false);

    expect((await a.get(`${url}?before=nonsense`)).status).toBe(400);
    expect((await a.post(url, { body: "   " })).status).toBe(400);
    expect((await a.post(url, { body: "x".repeat(2001) })).status).toBe(400);
  });

  it("doesn't mix group messages into friend chats or other groups", async () => {
    const a = await signUp();
    const b = await signUp();
    const g1 = await makeGroup(a, b);
    const g2 = await makeGroup(a, b);
    const clientMessageId = randomUUID();
    await a.post(`/api/groups/${g1}/messages`, { body: "for group one", clientMessageId });
    // Reusing the id in another conversation must not return the first group's message.
    expect((await a.post(`/api/groups/${g2}/messages`, { body: "for group two", clientMessageId })).status).toBe(403);
    expect((await b.get<Page>(`/api/groups/${g2}/messages`)).body.messages).toEqual([]);
  });
});
