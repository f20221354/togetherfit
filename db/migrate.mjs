// One-time setup: applies db/schema.sql to the database at DATABASE_URL.
// Usage: DATABASE_URL="postgres://..." node db/migrate.mjs
//    or: node db/migrate.mjs   (reads DATABASE_URL from .env.local automatically)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const here = path.dirname(fileURLToPath(import.meta.url));

if (!process.env.DATABASE_URL) {
  const envPath = path.join(here, "..", ".env.local");
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2].replace(/^"|"$/g, "");
      }
    }
  }
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Add it to .env.local or pass it inline.");
  process.exit(1);
}

const schema = fs.readFileSync(path.join(here, "schema.sql"), "utf8");
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false },
});

try {
  await pool.query(schema);
  console.log("Migration applied: app_users, connections, messages, activity_intents, groups, group_members, reports ready.");
} catch (err) {
  console.error("Migration failed:", err.message);
  process.exit(1);
} finally {
  await pool.end();
}
