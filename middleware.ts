// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

/**
 * Single robust middleware for SASTRACKER
 * - Allows /auth and its callbacks (so Supabase can set cookies)
 * - Protects every other route (including '/')
 * - Uses getSession() for stable auth detection
 * - Server-side signOut() for invalid domains and preserves Set-Cookie headers
 */

export async function middleware(req: NextRequest) {
  // Response object we hand to Supabase helper so it can write cookie headers on it
  const res = NextResponse.next();

  // Middleware Supabase client reads cookies from `req` and may mutate `res` (Set-Cookie)
  const supabase = createMiddlewareClient({ req, res });

  // Prefer getSession() for a robust session signal
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  const user = session?.user ?? null;
  const pathname = req.nextUrl.pathname;

  // PUBLIC: allow auth (and callbacks), next internals and common static assets
  if (
    pathname.startsWith("/auth") ||      // allow /auth, /auth/callback, etc.
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.startsWith("/api/public") || // optional: expose public APIs under this prefix
    pathname === "/favicon.ico" ||
    // allow images/fonts/static files
    !!pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|css|js|woff2?|ttf)$/)
  ) {
    return res;
  }

  // PROTECTED: everything else, including "/"
  if (!user) {
    // No session -> redirect to /auth
    const url = req.nextUrl.clone();
    url.pathname = "/auth";
    return NextResponse.redirect(url);
  }

  // Signed-in: validate SASTRA email domains
  const allowedDomains = [
    "@sastra.ac.in",
    "@it.sastra.edu",
    "@cse.sastra.edu",
    "@soc.sastra.edu",
  ];
  const email = (user.email ?? "").toLowerCase().trim();
  const isAllowed = allowedDomains.some((d) => email.endsWith(d));

  if (!isAllowed) {
    // Server-side sign out (this mutates `res` with Set-Cookie that clears tokens)
    await supabase.auth.signOut();

    // Redirect back to /auth with a flag and preserve the Set-Cookie headers
    const url = req.nextUrl.clone();
    url.pathname = "/auth";
    url.searchParams.set("invalid_domain", "1");

    const redirectRes = NextResponse.redirect(url);

    // Copy all headers that the supabase helper may have added to `res` into our redirect response.
    // This ensures Set-Cookie is delivered to the browser and tokens are cleared.
    for (const [key, value] of res.headers) {
      // Only set when not already present to avoid accidental overwrites
      if (!redirectRes.headers.has(key)) redirectRes.headers.set(key, value);
    }

    return redirectRes;
  }

  // Allowed user -> continue
  return res;
}

export const config = {
  // Run middleware for most routes; the code above excludes /auth and static files explicitly.
  matcher: [
    // Protect everything except static assets and the auth path (which we allow in code above)
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js|woff2?|ttf)$).*)",
  ],
};
