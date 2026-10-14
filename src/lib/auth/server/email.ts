import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import nodemailer, { type Transporter } from "nodemailer";

/**
 * Sends transactional email through Amazon SES (v2 API) or, until the
 * domain is set up in SES, any SMTP server (e.g. Gmail with an app password).
 * SES wins when both are configured.
 *
 * SES config (env):
 * - SES_REGION      e.g. "ap-south-1" — the region where your domain is verified
 * - EMAIL_FROM      e.g. "togetherfit <no-reply@yourdomain.com>" — a verified identity
 * - SES_ACCESS_KEY_ID / SES_SECRET_ACCESS_KEY — an IAM user allowed ses:SendEmail.
 *   Leave both unset when running on AWS with an IAM role; the SDK finds it.
 *
 * SMTP config (env):
 * - SMTP_USER / SMTP_PASS — for Gmail, the address and a 16-character app password
 * - SMTP_HOST / SMTP_PORT — default smtp.gmail.com:465 (TLS); SMTP_SECURE=true|false for other ports
 * - EMAIL_FROM      optional; defaults to "Togetherfit <SMTP_USER>". Gmail
 *   rewrites any other sender address to SMTP_USER.
 *
 * With neither configured in development, the email is printed to the server
 * console so the OTP flow can be tested locally. In production a missing
 * config is an error — codes are never logged there.
 */
let client: SESv2Client | null = null;
let smtp: Transporter | null = null;

function smtpTransport(user: string, pass: string): Transporter {
  const port = Number(process.env.SMTP_PORT ?? 465);
  // Implicit TLS on 465 by default; SMTP_SECURE=true|false overrides for other ports.
  const secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465;
  smtp ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "smtp.gmail.com",
    port,
    secure,
    requireTLS: !secure,
    // App passwords are often copied with their display spaces.
    auth: { user, pass: pass.replace(/\s+/g, "") },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 10_000,
  });
  return smtp;
}

function sesClient(region: string): SESv2Client {
  const accessKeyId = process.env.SES_ACCESS_KEY_ID;
  const secretAccessKey = process.env.SES_SECRET_ACCESS_KEY;
  client ??= new SESv2Client({
    region,
    credentials: accessKeyId && secretAccessKey ? { accessKeyId, secretAccessKey } : undefined,
  });
  return client;
}

export async function sendEmail(to: string, subject: string, text: string, html: string): Promise<void> {
  const region = process.env.SES_REGION;
  const from = process.env.EMAIL_FROM;
  const smtpUser = process.env.SMTP_USER?.trim();
  const smtpPass = process.env.SMTP_PASS;
  if (!(region && from) && smtpUser && smtpPass) {
    await smtpTransport(smtpUser, smtpPass).sendMail({ from: from || `Togetherfit <${smtpUser}>`, to, subject, text, html });
    return;
  }
  if (!region || !from) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Email is not configured: set SES_REGION and EMAIL_FROM, or SMTP_USER and SMTP_PASS");
    }
    console.log(`\n[dev email] to=${to} subject="${subject}"\n${text}\n`);
    return;
  }
  await sesClient(region).send(
    new SendEmailCommand({
      FromEmailAddress: from,
      Destination: { ToAddresses: [to] },
      Content: {
        Simple: {
          Subject: { Data: subject, Charset: "UTF-8" },
          Body: { Text: { Data: text, Charset: "UTF-8" }, Html: { Data: html, Charset: "UTF-8" } },
        },
      },
      ...(process.env.SES_CONFIGURATION_SET ? { ConfigurationSetName: process.env.SES_CONFIGURATION_SET } : {}),
    }),
    { abortSignal: AbortSignal.timeout(10_000) }
  );
}

const PURPOSE_COPY = {
  signup: { subject: "Your togetherfit verification code", lead: "Use this code to finish creating your account:" },
  login: { subject: "Your togetherfit sign-in code", lead: "Use this code to finish signing in:" },
  reset: { subject: "Reset your togetherfit password", lead: "Use this code to reset your password:" },
  email_change: { subject: "Confirm your new togetherfit email", lead: "Use this code to confirm this is your new email address:" },
} as const;

export async function sendOtpEmail(to: string, purpose: keyof typeof PURPOSE_COPY, code: string): Promise<void> {
  const copy = PURPOSE_COPY[purpose];
  const text = `${copy.lead}\n\n${code}\n\nThe code expires in 10 minutes. If you didn't request it, you can ignore this email — someone may have typed your address by mistake.`;
  const html = `<div style="font-family:system-ui,sans-serif;max-width:420px">
<p>${copy.lead}</p>
<p style="font-size:28px;font-weight:700;letter-spacing:6px">${code}</p>
<p style="color:#6b7280;font-size:13px">The code expires in 10 minutes. If you didn't request it, you can ignore this email.</p>
</div>`;
  await sendEmail(to, copy.subject, text, html);
}

/** Sent instead of a signup code when the email already has an account, so signup doesn't reveal it. */
export async function sendAccountExistsEmail(to: string): Promise<void> {
  const text =
    "Someone tried to create a togetherfit account with this email, but you already have one. " +
    "Log in instead, or use \"Forgot password\" if you can't remember it. If this wasn't you, you can ignore this email.";
  await sendEmail(to, "You already have a togetherfit account", text, `<p style="font-family:system-ui,sans-serif">${text}</p>`);
}

/** Sent to the old address after an email change, so a hijacked account doesn't go unnoticed. */
export async function sendEmailChangedNotice(oldEmail: string, newEmail: string): Promise<void> {
  const masked = newEmail.replace(/^(.).*(@.*)$/, "$1***$2");
  const text =
    `The email address on your togetherfit account was changed to ${masked}. ` +
    "If you made this change, there's nothing to do. If you didn't, reset your password right away from the login page and contact us.";
  await sendEmail(oldEmail, "Your togetherfit email was changed", text, `<p style="font-family:system-ui,sans-serif">${text}</p>`);
}

/** Sent after a password change. */
export async function sendPasswordChangedNotice(email: string): Promise<void> {
  const text =
    "Your togetherfit password was just changed, and you were signed out on your other devices. " +
    "If this wasn't you, reset your password from the login page right away.";
  await sendEmail(email, "Your togetherfit password was changed", text, `<p style="font-family:system-ui,sans-serif">${text}</p>`);
}
