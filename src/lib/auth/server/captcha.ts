import { reportError } from "@/lib/observability/report";
/**
 * Bot check for sign-up and password reset, so scripts can't make us email
 * thousands of strangers (which would get our sender suspended).
 *
 * CAPTCHA=turnstile uses Cloudflare Turnstile (free): needs
 * TURNSTILE_SECRET_KEY here and NEXT_PUBLIC_TURNSTILE_SITE_KEY in the
 * browser. Anything else (or unset) turns the check off, for development.
 * Cloudflare's test keys: site 1x00000000000000000000AA with secret
 * 1x0000000000000000000000000000000AA always pass; secret
 * 2x0000000000000000000000000000000AA always fails.
 */
const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export function captchaEnabled(): boolean {
  return process.env.CAPTCHA === "turnstile";
}

/** True if the token proves a human (or the check is off). Fails closed if Cloudflare can't be reached. */
export async function verifyCaptcha(token: unknown, ip: string): Promise<boolean> {
  if (!captchaEnabled()) return true;
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    reportError(new Error('CAPTCHA="turnstile" but TURNSTILE_SECRET_KEY is not set; rejecting sign-ups'), { where: "captcha" });
    return false;
  }
  if (typeof token !== "string" || !token || token.length > 2048) return false;
  try {
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      body: new URLSearchParams({ secret, response: token, remoteip: ip }),
      signal: AbortSignal.timeout(5000),
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch (err) {
    reportError(err, { where: "captcha verify" });
    return false;
  }
}

export const CAPTCHA_ERROR = "Please complete the quick check that you're not a robot, then try again.";
