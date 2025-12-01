// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

export async function middleware(req: NextRequest) {
  // a response object handed to the supabase helper so it can set cookies on it
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  // use getSession() for a reliable session signal
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  const pathname = req.nextUrl.pathname;

  // PUBLIC: allow auth routes (OAuth callbacks), next internals, static assets
  if (
    pathname.startsWith("/auth") ||        // allow /auth and any /auth/* e.g. OAuth callback
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.startsWith("/api/public") || // optional: mark any public API you want available without auth
    pathname === "/favicon.ico" ||
    pathname.match(/\.(svg|png|jpg|jpeg|gif|webp)$/)
  ) {
    return res;
  }

  // PROTECTED: everything else (including "/")
  if (!user) {
    const url = req.nextUrl.clone();
    url.pathname = "/auth";
    return NextResponse.redirect(url);
  }

  // Validate allowed email domains
  const allowedDomains = [
    "@sastra.ac.in",
    "@it.sastra.edu",
    "@cse.sastra.edu",
    "@soc.sastra.edu",
  ];
  const email = (user.email ?? "").toLowerCase().trim();
  const isAllowed = allowedDomains.some((d) => email.endsWith(d));

  if (!isAllowed) {
    // Perform server-side sign out so supabase helper writes Set-Cookie to clear tokens
    await supabase.auth.signOut();

    // Redirect to /auth with a flag and preserve headers (Set-Cookie) written into `res`
    const url = req.nextUrl.clone();
    url.pathname = "/auth";
    url.searchParams.set("invalid_domain", "1");
    const redirectRes = NextResponse.redirect(url);

    // Copy headers from the response that supabase mutated into the redirect response
    // (this ensures the browser receives Set-Cookie clearing tokens)
    for (const [key, value] of res.headers) {
      redirectRes.headers.set(key, value);
    }

    return redirectRes;
  }

  // Signed in and allowed -> allow the request
  return res;
}

export const config = {
  // Run middleware for most routes (we excluded /auth in code above).
  // This negative-lookahead keeps middleware off of static assets and auth routes.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|auth|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
