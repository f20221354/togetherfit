/**
 * Client-side password hashing for the mock auth layer. This is NOT a
 * substitute for server-side hashing (bcrypt/argon2) — it only exists so we
 * never write a plain-text password to localStorage in this prototype. When
 * a real backend (Supabase/Firebase/Auth.js) is wired up, this file and
 * `authStore.ts` are the only places that need to change.
 */
export async function hashPassword(password: string, email: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`vitaos::${email.toLowerCase()}::${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
