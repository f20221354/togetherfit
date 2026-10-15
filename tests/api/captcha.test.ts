import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client, PASSWORD, clearRateLimits, db, uniqueEmail } from "./helpers";

/**
 * Runs only when the server under test has CAPTCHA=turnstile with
 * Cloudflare's always-pass secret (TEST_CAPTCHA=pass) or always-fail
 * secret (TEST_CAPTCHA=fail).
 */
const mode = process.env.TEST_CAPTCHA;

beforeAll(clearRateLimits);
afterAll(() => db.end());

describe.runIf(mode === "pass")("captcha on (always-pass test key)", () => {
  it("rejects sign-up without a token", async () => {
    const r = await new Client().post("/api/auth/signup", { email: uniqueEmail(), name: "Bot", password: PASSWORD });
    expect(r.status).toBe(400);
  });
  it("accepts sign-up and reset with a token", async () => {
    const c = new Client();
    const email = uniqueEmail();
    expect((await c.post("/api/auth/signup", { email, name: "Human", password: PASSWORD, captchaToken: "XXXX.DUMMY.TOKEN.XXXX" })).status).toBe(200);
    expect((await c.post("/api/auth/forgot", { email, captchaToken: "XXXX.DUMMY.TOKEN.XXXX" })).status).toBe(200);
  });
});

describe.runIf(mode === "fail")("captcha on (always-fail test key)", () => {
  it("rejects even with a token", async () => {
    const r = await new Client().post("/api/auth/signup", { email: uniqueEmail(), name: "Bot", password: PASSWORD, captchaToken: "XXXX.DUMMY.TOKEN.XXXX" });
    expect(r.status).toBe(400);
    expect((await new Client().post("/api/auth/forgot", { email: uniqueEmail(), captchaToken: "x" })).status).toBe(400);
  });
});

describe.runIf(!mode)("captcha off", () => {
  it("sign-up works without a token", async () => {
    expect((await new Client().post("/api/auth/signup", { email: uniqueEmail(), name: "Dev", password: PASSWORD })).status).toBe(200);
  });
});
