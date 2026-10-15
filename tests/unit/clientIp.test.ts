import { afterEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { clientIp } from "@/lib/auth/server/rateLimit";

const req = (headers: Record<string, string>) => new NextRequest("http://localhost/api/x", { headers });

afterEach(() => {
  delete process.env.TRUSTED_PROXY_HOPS;
  delete process.env.CLIENT_IP_HEADER;
});

describe("clientIp", () => {
  it("ignores a spoofed first X-Forwarded-For entry behind one proxy", () => {
    // The client sent "1.1.1.1"; our proxy appended the real address it saw.
    expect(clientIp(req({ "x-forwarded-for": "1.1.1.1, 203.0.113.9" }))).toBe("203.0.113.9");
  });

  it("works when the platform sends only the client (Vercel)", () => {
    expect(clientIp(req({ "x-forwarded-for": "203.0.113.9" }))).toBe("203.0.113.9");
  });

  it("counts several trusted proxies from the right", () => {
    process.env.TRUSTED_PROXY_HOPS = "2";
    expect(clientIp(req({ "x-forwarded-for": "1.1.1.1, 203.0.113.9, 10.0.0.2" }))).toBe("203.0.113.9");
  });

  it("uses a header the proxy sets itself when configured", () => {
    process.env.CLIENT_IP_HEADER = "cf-connecting-ip";
    expect(clientIp(req({ "cf-connecting-ip": "198.51.100.4", "x-forwarded-for": "1.1.1.1" }))).toBe("198.51.100.4");
  });

  it("falls back to x-real-ip, then unknown", () => {
    expect(clientIp(req({ "x-real-ip": "198.51.100.7" }))).toBe("198.51.100.7");
    expect(clientIp(req({}))).toBe("unknown");
  });
});
