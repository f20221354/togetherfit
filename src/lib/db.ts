import { Pool } from "pg";

/**
 * The one real, shared backend connection in this app — everything else is
 * Zustand + localStorage. Requires DATABASE_URL (any Postgres provider).
 * Reused across hot reloads in dev via a global, same pattern Next.js docs
 * recommend for Prisma/pg clients.
 */
declare global {
  var _pgPool: Pool | undefined;
}

export function getPool(): Pool {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is not set. Provision a free Postgres database (Vercel dashboard → Storage → " +
        "Marketplace Database Providers → Neon, or any Postgres provider) and set DATABASE_URL."
    );
  }
  if (!global._pgPool) {
    global._pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      // Hosted Postgres providers (Neon, Supabase, etc.) require SSL; set
      // DATABASE_SSL=false only for a local/test database that doesn't support it.
      ssl: process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false },
    });
  }
  return global._pgPool;
}
