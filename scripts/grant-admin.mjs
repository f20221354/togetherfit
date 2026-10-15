// Makes an existing account an admin (can review reports and verification appeals).
// Usage: npm run admin:grant -- someone@example.com
//        npm run admin:grant -- someone@example.com --revoke
//   (reads DATABASE_URL from .env.local if it isn't already set)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const envPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim().replace(/^"|"$/g, "");
  }
}

const email = process.argv[2]?.trim().toLowerCase();
const revoke = process.argv.includes("--revoke");
if (!email || !process.env.DATABASE_URL) {
  console.error("Usage: npm run admin:grant -- someone@example.com [--revoke]   (needs DATABASE_URL)");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  // Same rules as src/lib/db.ts: verified TLS unless DATABASE_SSL=false (local) or no-verify.
  ssl:
    process.env.DATABASE_SSL === "false"
      ? false
      : process.env.DATABASE_SSL === "no-verify"
        ? { rejectUnauthorized: false }
        : { rejectUnauthorized: true, ...(process.env.DATABASE_CA_CERT ? { ca: process.env.DATABASE_CA_CERT.replace(/\\n/g, "\n") } : {}) },
});
const result = await pool.query("update app_users set role = $2 where email = $1 returning name", [email, revoke ? "user" : "admin"]);
await pool.end();
if (result.rowCount === 0) {
  console.error(`No account with email ${email}. Sign up first, then run this again.`);
  process.exit(1);
}
console.log(`${result.rows[0].name} (${email}) is ${revoke ? "no longer an admin" : "now an admin"}. They may need to reload the app.`);
