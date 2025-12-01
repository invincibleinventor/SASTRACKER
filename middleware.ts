// app/middleware.ts (or middleware.ts)
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

export async function middleware(req: NextRequest) {
  // base response we hand to createMiddlewareClient so it can set cookies if needed
  const res = NextResponse.next();

  // supabase middleware client reads cookies from `req` and will write cookie updates to `res`
  const supabase = createMiddlewareClient({ req, res });

  // get current user (if any)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = req.nextUrl.pathname;

  // allow these public paths without auth checks
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/static") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.match(/\.(svg|png|jpg|jpeg|gif|webp)$/)
  ) {
    return res;
  }

  const isAuthPage = pathname === "/auth" || pathname.startsWith("/auth/");

  // If user not logged in -> only allow /auth, otherwise redirect to /auth
  if (!user) {
    if (!isAuthPage) {
      const url = req.nextUrl.clone();
      url.pathname = "/auth";

      // return a redirect response (no cookie mutations needed by supabase here)
      return NextResponse.redirect(url);
    }

    // allow /auth
    return res;
  }

  // user is logged in — validate email domain
  const allowedDomains = [
    "@sastra.ac.in",
    "@it.sastra.edu",
    "@cse.sastra.edu",
    "@soc.sastra.edu",
  ];

  const email = (user.email || "").toLowerCase().trim();

  const isAllowed = allowedDomains.some((domain) => email.endsWith(domain));

  if (!isAllowed) {
    // If email invalid -> sign out the session (this mutates `res` with Set-Cookie)
    await supabase.auth.signOut();

    // redirect to /auth, but we must preserve the cookie headers written to `res`
    const url = req.nextUrl.clone();
    url.pathname = "/auth";

    const redirectRes = NextResponse.redirect(url);

    // copy all headers from the `res` that supabase mutated into our redirect response
    // this ensures Set-Cookie headers (clearing tokens) are preserved
    for (const [key, value] of res.headers) {
      // don't overwrite existing headers accidentally
      redirectRes.headers.set(key, value);
    }

    return redirectRes;
  }

  // user logged in and allowed -> allow request
  return res;
}

export const config = {
  // protect all routes (except static assets matched above)
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
