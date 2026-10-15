"use client";

export type AuthResult<T> = { ok: true; data: T } | { ok: false; error: string };

/** POSTs JSON to an /api/auth endpoint and normalizes the result. */
export async function authPost<T>(url: string, body: unknown): Promise<AuthResult<T>> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      return { ok: false, error: data.error ?? "Something went wrong. Please try again." };
    }
    return { ok: true, data: data as T };
  } catch {
    return { ok: false, error: "Can't reach togetherfit. Check your connection and try again." };
  }
}
