// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

export async function middleware(req: NextRequest) {
  // base response we pass to supabase helper (so it can read/modify cookies if needed)
  const res = NextResponse.next();

  // create middleware supabase client that reads cookies from req
  const supabase = createMiddlewareClient({ req, res });

  // Get session (more explicit than getUser())
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  const pathname = req.nextUrl.pathname;

  // allow static assets and the auth page itself
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.startsWith("/api") ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/auth") ||
    pathname.match(/\.(svg|png|jpg|jpeg|gif|webp)$/)
  ) {
    return res;
  }

  // If there's no session -> redirect to /auth
  if (!user) {
    const url = req.nextUrl.clone();
    url.pathname = "/auth";
    return NextResponse.redirect(url);
  }

  // If there's a user, validate their email domain
  const allowedDomains = [
    "@sastra.ac.in",
    "@it.sastra.edu",
    "@cse.sastra.edu",
    "@soc.sastra.edu",
  ];

  const email = (user.email ?? "").toLowerCase().trim();

  const isAllowed = allowedDomains.some((d) => email.endsWith(d));

  if (!isAllowed) {
    // Redirect to /auth and include query param to indicate invalid domain.
    // We DON'T sign out here — sign out will be performed client-side on /auth
    const url = req.nextUrl.clone();
    url.pathname = "/auth";
    url.searchParams.set("invalid_domain", "1");
    return NextResponse.redirect(url);
  }

  // User signed in and email allowed -> allow access
  return res;
}

export const config = {
  // protect all routes except static files and /auth (we handle /auth above)
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|auth|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};