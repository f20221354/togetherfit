// Sends one test email using the same env vars and precedence as the app:
// SES when SES_REGION + EMAIL_FROM are set, otherwise SMTP (SMTP_USER + SMTP_PASS).
// Usage: npm run email:test -- you@example.com
//   (reads SES_*, SMTP_* and EMAIL_FROM from .env.local if they aren't already set)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import nodemailer from "nodemailer";

const envPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim().replace(/^"|"$/g, "");
  }
}

const to = process.argv[2];
const { SES_REGION, EMAIL_FROM, SES_ACCESS_KEY_ID, SES_SECRET_ACCESS_KEY, SMTP_USER, SMTP_PASS, SMTP_HOST, SMTP_PORT } = process.env;
if (!to) {
  console.error("Usage: npm run email:test -- you@example.com");
  process.exit(1);
}

if (!(SES_REGION && EMAIL_FROM)) {
  if (!SMTP_USER || !SMTP_PASS) {
    console.error("Set SMTP_USER and SMTP_PASS (or SES_REGION and EMAIL_FROM) in .env.local first.");
    process.exit(1);
  }
  const port = Number(SMTP_PORT ?? 465);
  const transport = nodemailer.createTransport({
    host: SMTP_HOST ?? "smtp.gmail.com",
    port,
    secure: port === 465,
    requireTLS: port !== 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS.replace(/\s+/g, "") },
  });
  try {
    const info = await transport.sendMail({
      from: EMAIL_FROM || `Togetherfit <${SMTP_USER}>`,
      to,
      subject: "togetherfit SMTP test",
      text: "If you can read this, SMTP is configured correctly for togetherfit.",
    });
    console.log(`Sent via SMTP. Message id: ${info.messageId}`);
  } catch (err) {
    console.error(`SMTP rejected the email: ${err.message}`);
    if (/535|Username and Password not accepted/i.test(err.message)) {
      console.error("→ For Gmail, SMTP_PASS must be an app password (Google Account → Security → 2-Step Verification → App passwords).");
    }
    process.exit(1);
  }
  process.exit(0);
}

const client = new SESv2Client({
  region: SES_REGION,
  credentials: SES_ACCESS_KEY_ID && SES_SECRET_ACCESS_KEY ? { accessKeyId: SES_ACCESS_KEY_ID, secretAccessKey: SES_SECRET_ACCESS_KEY } : undefined,
});

try {
  const result = await client.send(
    new SendEmailCommand({
      FromEmailAddress: EMAIL_FROM,
      Destination: { ToAddresses: [to] },
      Content: {
        Simple: {
          Subject: { Data: "togetherfit SES test" },
          Body: { Text: { Data: "If you can read this, SES is configured correctly for togetherfit." } },
        },
      },
    })
  );
  console.log(`Sent. SES message id: ${result.MessageId}`);
} catch (err) {
  console.error(`SES rejected the email: ${err.name}: ${err.message}`);
  if (err.name === "MessageRejected" && /not verified/i.test(err.message)) {
    console.error("→ In the SES sandbox both the sender and the recipient must be verified identities (SES console → Identities).");
  }
  process.exit(1);
}
