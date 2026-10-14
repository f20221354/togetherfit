import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { BASE, Client, clearRateLimits, db, makeGroup, signUp } from "./helpers";

/** The streaming tests run when the server under test has REALTIME=sse (TEST_REALTIME=sse). */
const sse = process.env.TEST_REALTIME === "sse";

beforeAll(clearRateLimits);
afterAll(() => db.end());

/** Opens the event stream and collects events until `stop()`. */
async function openStream(c: Client) {
  const abort = new AbortController();
  const res = await fetch(`${BASE}/api/realtime/stream`, {
    headers: { cookie: `tf_session=${c.cookie}` },
    signal: abort.signal,
  });
  const events: { event: string; data: string }[] = [];
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const pump = (async () => {
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) return;
        buffer += decoder.decode(value, { stream: true });
        let end;
        while ((end = buffer.indexOf("\n\n")) >= 0) {
          const block = buffer.slice(0, end);
          buffer = buffer.slice(end + 2);
          const event = block.match(/^event: (.*)$/m)?.[1];
          const data = block.match(/^data: (.*)$/m)?.[1] ?? "";
          if (event) events.push({ event, data });
        }
      }
    } catch {
      // aborted
    }
  })();
  const waitFor = async (pred: (e: { event: string; data: string }) => boolean, ms = 5_000) => {
    const until = Date.now() + ms;
    while (Date.now() < until) {
      const hit = events.find(pred);
      if (hit) return hit;
      await new Promise((r) => setTimeout(r, 50));
    }
    return null;
  };
  return {
    res,
    events,
    waitFor,
    stop: async () => {
      abort.abort();
      await pump;
    },
  };
}

describe("realtime config", () => {
  it("needs a session", async () => {
    expect((await new Client().get("/api/realtime/config")).status).toBe(401);
    expect((await new Client().get("/api/realtime/stream")).status).toBe(401);
  });
});

describe.runIf(!sse)("realtime stream when REALTIME isn't sse", () => {
  it("is not available", async () => {
    const a = await signUp();
    expect((await a.get("/api/realtime/stream")).status).toBe(404);
  });
});

describe.runIf(sse)("realtime stream (REALTIME=sse)", () => {
  it("tells the browser to use sse", async () => {
    const a = await signUp();
    expect((await a.get<{ mode: string }>("/api/realtime/config")).body.mode).toBe("sse");
  });

  it("delivers a signal to other members only, with ids and no message content", async () => {
    const a = await signUp();
    const b = await signUp();
    const outsider = await signUp();
    const groupId = await makeGroup(a, b);

    const streamA = await openStream(a);
    const streamOut = await openStream(outsider);
    expect(streamA.res.headers.get("content-type")).toContain("text/event-stream");
    expect(await streamA.waitFor((e) => e.event === "ready")).not.toBeNull();
    expect(await streamOut.waitFor((e) => e.event === "ready")).not.toBeNull();

    expect((await b.post(`/api/groups/${groupId}/messages`, { body: "secret plan" })).status).toBe(200);
    const signal = await streamA.waitFor((e) => e.event === "chat");
    expect(signal && JSON.parse(signal.data)).toEqual({ type: "chat", groupId });
    expect(signal?.data).not.toContain("secret");

    await new Promise((r) => setTimeout(r, 500));
    expect(streamOut.events.some((e) => e.event === "chat")).toBe(false);
    await streamA.stop();
    await streamOut.stop();
  });
});
