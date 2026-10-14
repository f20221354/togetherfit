import { afterAll, describe, expect, it } from "vitest";
import { BASE, Client, db } from "./helpers";

afterAll(() => db.end());

describe("health check", () => {
  it("reports the database as up, without a session", async () => {
    const r = await new Client().get<{ db: string }>("/api/health");
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ ok: true, db: "up" });
  });
});

describe("client error reports", () => {
  it("accepts a sanitized report from this site and rejects empty or cross-site ones", async () => {
    const c = new Client();
    expect((await c.post("/api/client-errors", { message: "boom", stack: "x".repeat(10_000), path: "/move?email=a@b.co" })).status).toBe(200);
    expect((await c.post("/api/client-errors", {})).status).toBe(400);
    const cross = await fetch(`${BASE}/api/client-errors`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://evil.example" },
      body: JSON.stringify({ message: "spoof" }),
    });
    expect(cross.status).toBe(403);
  });
});
