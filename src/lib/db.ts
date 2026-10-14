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

/**
 * TLS to the database. Verified by default: hosted Postgres (Neon, Supabase,
 * RDS…) uses publicly trusted certificates. DATABASE_CA_CERT can hold a
 * provider's CA (PEM) if it uses its own. DATABASE_SSL=false only for a
 * local database without TLS; DATABASE_SSL=no-verify encrypts without
 * checking the certificate (not recommended).
 */
export function sslConfig() {
  const mode = process.env.DATABASE_SSL;
  if (mode === "false") return false;
  if (mode === "no-verify") return { rejectUnauthorized: false };
  const ca = process.env.DATABASE_CA_CERT?.replace(/\\n/g, "\n");
  return ca ? { rejectUnauthorized: true, ca } : { rejectUnauthorized: true };
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
      ssl: sslConfig(),
    });
  }
  return global._pgPool;
}
