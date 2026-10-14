import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { BASE, Client, PASSWORD, clearRateLimits, db, signUp, userId } from "./helpers";

beforeAll(clearRateLimits);
afterAll(() => db.end());

const STORE = "/api/state/vitaos-move-store";

async function put(c: Client, path: string, data: unknown, baseRevision: number) {
  const res = await fetch(BASE + path, {
    method: "PUT",
    headers: { "content-type": "application/json", origin: BASE, cookie: `tf_session=${c.cookie}` },
    body: JSON.stringify({ data, baseRevision }),
  });
  return { status: res.status, body: await res.json() };
}

describe("synced app data", () => {
  it("saves with revisions and refuses stale writes", async () => {
    const a = await signUp();
    expect((await a.get<{ stores: object }>("/api/state")).body.stores).toEqual({});

    const v1 = { state: { goals: [{ id: "g1", label: "Run 5 km" }] }, version: 0 };
    const first = await put(a, STORE, v1, 0);
    expect(first.status).toBe(200);
    expect(first.body.revision).toBe(1);

    // A second device that never synced also tries to create it: conflict, with the current copy.
    const stale = await put(a, STORE, { state: { goals: [] }, version: 0 }, 0);
    expect(stale.status).toBe(409);
    expect(stale.body.current).toMatchObject({ revision: 1, data: v1 });

    const v2 = { state: { goals: [] }, version: 0 };
    expect((await put(a, STORE, v2, 1)).body.revision).toBe(2);
    expect((await put(a, STORE, v1, 1)).status).toBe(409);

    const all = await a.get<{ stores: Record<string, { revision: number; data: unknown }> }>("/api/state");
    expect(all.body.stores["vitaos-move-store"]).toMatchObject({ revision: 2, data: v2 });
  });

  it("validates input and keeps accounts separate", async () => {
    const a = await signUp();
    const b = await signUp();
    expect((await put(a, "/api/state/somebody-elses-store", {}, 0)).status).toBe(404);
    expect((await put(a, STORE, "nope", 0)).status).toBe(400);
    expect((await put(a, STORE, {}, -1)).status).toBe(400);
    expect((await put(a, STORE, { big: "x".repeat(300 * 1024) }, 0)).status).toBe(413);
    expect((await put(new Client(), STORE, {}, 0)).status).toBe(401);

    await put(a, STORE, { state: { secret: "a's goals" }, version: 0 }, 0);
    expect((await b.get<{ stores: object }>("/api/state")).body.stores).toEqual({});
  });

  it("is in the data export and deleted with the account", async () => {
    const a = await signUp();
    await put(a, "/api/state/vitaos-wellness-store", { state: { events: [] }, version: 1 }, 0);
    const exported = await a.get<{ data: { appData: { store: string }[] } }>("/api/account/export");
    expect(exported.body.data.appData.map((r) => r.store)).toEqual(["vitaos-wellness-store"]);

    const id = await userId(a);
    expect((await a.post("/api/account/delete", { password: PASSWORD })).status).toBe(200);
    expect((await db.query("select count(*)::int as n from user_app_state where user_id = $1", [id])).rows[0].n).toBe(0);
  });
});
