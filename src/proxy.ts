import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "tf_session";
const PUBLIC_PAGES = ["/login", "/signup", "/forgot-password", "/privacy", "/terms"];
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * 1. CSRF: state-changing API calls must come from this site's own pages.
 *    (The session cookie is also SameSite=Lax.)
 * 2. Pages: no session cookie → straight to /login, before any JS loads.
 *    This is only an optimistic check; every API route still verifies the
 *    session against the database via requireUser().
 */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api/")) {
    if (!SAFE_METHODS.has(req.method)) {
      const origin = req.headers.get("origin");
      // URL.parse returns null for "null" (sandboxed iframes, file://), which is cross-site too.
      if (origin && URL.parse(origin)?.host !== req.headers.get("host")) {
        return NextResponse.json({ ok: false, error: "Cross-site request blocked" }, { status: 403 });
      }
    }
    return NextResponse.next();
  }

  const isPublic = PUBLIC_PAGES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (!isPublic && !req.cookies.has(SESSION_COOKIE)) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|manifest.webmanifest|brand/|exercises/|.*\\.(?:png|jpg|jpeg|svg|webp|gif|ico|txt)$).*)"],
};
