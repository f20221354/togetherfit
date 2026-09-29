import { NextResponse } from "next/server";

export function bad(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

export function serverError(err: unknown) {
  return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
}

export function normEmail(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim().toLowerCase() : null;
}
