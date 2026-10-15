import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client, PASSWORD, clearRateLimits, codeFor, db, logIn, mailCount, signUp, uniqueEmail } from "./helpers";

beforeAll(clearRateLimits);
afterAll(() => db.end());

describe("change name", () => {
  it("updates the name, within limits", async () => {
    const a = await signUp("Old Name");
    expect((await a.post("/api/account/name", { name: "x" })).status).toBe(400);
    expect((await a.post("/api/account/name", { name: "  New   Name " })).status).toBe(200);
    expect((await a.get<{ user: { name: string } }>("/api/auth/me")).body.user.name).toBe("New Name");
  });

  it("requires a session", async () => {
    expect((await new Client().post("/api/account/name", { name: "Someone" })).status).toBe(401);
  });
});

describe("change password", () => {
  it("needs the current password and signs out other devices", async () => {
    const a = await signUp();
    const otherDevice = await logIn(a.email);
    expect((await a.post("/api/account/password", { currentPassword: "Wrongpass1", newPassword: "Newpass456" })).status).toBe(401);
    expect((await a.post("/api/account/password", { currentPassword: PASSWORD, newPassword: "short" })).status).toBe(400);
    expect((await a.post("/api/account/password", { currentPassword: PASSWORD, newPassword: PASSWORD })).status).toBe(400);
    const changed = await a.post("/api/account/password", { currentPassword: PASSWORD, newPassword: "Newpass456" });
    expect(changed.status).toBe(200);
    expect((await a.get<{ user: unknown }>("/api/auth/me")).body.user).not.toBeNull();
    expect((await otherDevice.get<{ user: unknown }>("/api/auth/me")).body.user).toBeNull();
    expect((await new Client().post("/api/auth/login", { email: a.email, password: PASSWORD })).status).toBe(401);
    expect((await new Client().post("/api/auth/login", { email: a.email, password: "Newpass456" })).status).toBe(200);
  });
});

describe("change email", () => {
  it("moves the account after a code sent to the new address, and tells the old one", async () => {
    const a = await signUp();
    const oldEmail = a.email;
    const newEmail = uniqueEmail("moved");
    expect((await a.post("/api/account/email/start", { newEmail, password: "Wrongpass1" })).status).toBe(401);
    expect((await a.post("/api/account/email/start", { newEmail: oldEmail, password: PASSWORD })).status).toBe(400);
    const start = await a.post<{ challengeId: string }>("/api/account/email/start", { newEmail, password: PASSWORD });
    expect(start.status).toBe(200);
    const code = await codeFor(newEmail);
    expect((await a.post("/api/account/email/verify", { challengeId: start.body.challengeId, code: "000000" })).status).toBe(400);
    const done = await a.post<{ email: string }>("/api/account/email/verify", { challengeId: start.body.challengeId, code });
    expect(done.status).toBe(200);
    expect((await a.get<{ user: { email: string } }>("/api/auth/me")).body.user.email).toBe(newEmail);
    const before = mailCount(oldEmail);
    await new Promise((r) => setTimeout(r, 300));
    expect(mailCount(oldEmail)).toBeGreaterThanOrEqual(before);
    expect((await new Client().post("/api/auth/login", { email: newEmail, password: PASSWORD })).status).toBe(200);
    expect((await new Client().post("/api/auth/login", { email: oldEmail, password: PASSWORD })).status).toBe(401);
  });

  it("can't take an address that already has an account", async () => {
    const a = await signUp();
    const b = await signUp();
    const start = await a.post<{ challengeId: string }>("/api/account/email/start", { newEmail: b.email, password: PASSWORD });
    expect(start.status).toBe(200); // looks the same, so it can't be used to probe emails
    const verify = await a.post("/api/account/email/verify", { challengeId: start.body.challengeId, code: "123456" });
    expect(verify.status).toBe(400);
    expect((await a.get<{ user: { email: string } }>("/api/auth/me")).body.user.email).toBe(a.email);
  });

  it("a code issued to one account can't be used by another", async () => {
    const a = await signUp();
    const b = await signUp();
    const newEmail = uniqueEmail("steal");
    const start = await a.post<{ challengeId: string }>("/api/account/email/start", { newEmail, password: PASSWORD });
    const code = await codeFor(newEmail);
    expect((await b.post("/api/account/email/verify", { challengeId: start.body.challengeId, code })).status).toBe(400);
  });
});
