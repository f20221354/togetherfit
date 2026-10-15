// Checks the Ably setup used by realtime chat, with the same rules as the app:
//   1. a user token can subscribe to its own channel and receives a server publish
//   2. the same token is refused on someone else's channel
// Usage: npm run realtime:test   (reads ABLY_API_KEY from .env.local if it isn't already set)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Realtime, Rest } from "ably";

const envPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim().replace(/^"|"$/g, "");
  }
}

const key = process.env.ABLY_API_KEY;
if (!key) {
  console.error("Set ABLY_API_KEY in .env.local first (Ably dashboard → your app → API Keys).");
  process.exit(1);
}

const rest = new Rest({ key });
const me = `realtime-test-${Date.now()}`;
const tokenRequest = await rest.auth.createTokenRequest({ clientId: me, capability: { [`user:${me}`]: ["subscribe"] } });
const realtime = new Realtime({ authCallback: (_params, cb) => cb(null, tokenRequest) });
const timeout = (ms, what) => new Promise((_, reject) => setTimeout(() => reject(new Error(`timed out: ${what}`)), ms));
let failed = false;

try {
  const own = realtime.channels.get(`user:${me}`);
  const received = new Promise((resolve) => own.subscribe("chat", (msg) => resolve(msg.data)));
  await Promise.race([own.attach(), timeout(10_000, "attaching to own channel")]);
  const sentAt = Date.now();
  await rest.channels.get(`user:${me}`).publish("chat", { type: "chat", connectionId: "test" });
  await Promise.race([received, timeout(10_000, "receiving the signal")]);
  console.log(`PASS  signal delivered to own channel in ${Date.now() - sentAt} ms`);
} catch (err) {
  failed = true;
  console.error(`FAIL  own channel: ${err.message}`);
}

try {
  await Promise.race([realtime.channels.get("user:someone-else").attach(), timeout(10_000, "attach")]);
  failed = true;
  console.error("FAIL  token could attach to another user's channel");
} catch (err) {
  console.log(`PASS  another user's channel is refused (${err.code ?? err.message})`);
}

realtime.close();
process.exit(failed ? 1 : 0);
