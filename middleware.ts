// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

/**
 * Middleware responsibilities:
 *  - Let static assets, /auth, and /auth/callback pass through without creating the Supabase client.
 *  - For other routes, read session via createMiddlewareClient and enforce allowed email domains.
 *  - If domain invalid -> sign out server-side and redirect to /auth?invalid_domain=1
 */

const STATIC_AND_ICON_REGEX = /\.(svg|png|jpg|jpeg|gif|webp|css|js|woff2?|ttf)$/;

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // 1) ALWAYS ignore Next/static, images, and favicon early
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname === "/favicon.ico" ||
    STATIC_AND_ICON_REGEX.test(pathname)
  ) {
    return NextResponse.next();
  }

  // 2) Explicitly allow auth pages and callback without creating supabase client (prevents crashes)
  if (pathname === "/auth/callback" || pathname.startsWith("/auth")) {
    return NextResponse.next();
  }

  // 3) For all other routes create the middleware supabase client (it will read cookies)
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  try {
    const {
      data: { session },
      error: sessionErr,
    } = await supabase.auth.getSession();

    if (sessionErr) {
      console.error("Supabase getSession error in middleware:", sessionErr);
      // If we can't read the session, redirect to auth (safe fallback)
      const url = req.nextUrl.clone();
      url.pathname = "/auth";
      return NextResponse.redirect(url);
    }

    const user = session?.user ?? null;

    // 4) If user exists enforce allowed email domains
    if (user) {
      const allowedDomains = ["sastra.ac.in", "sastra.edu"];
      const email = (user.email ?? "").toLowerCase().trim();
      const isAllowed = allowedDomains.some((d) => email.endsWith(d));

      if (!isAllowed) {
        // Build redirect response and attach sign-out cookies to it
        const redirectUrl = req.nextUrl.clone();
        redirectUrl.pathname = "/auth";
        redirectUrl.searchParams.set("invalid_domain", "1");

        const redirectRes = NextResponse.redirect(redirectUrl);

        // Create a client that will write cookies onto the redirect response
        const supabaseSignOut = createMiddlewareClient({ req, res: redirectRes });
        try {
          await supabaseSignOut.auth.signOut();
        } catch (signOutErr) {
          // Log but continue to return the redirect response anyway
          console.error("Error signing out in middleware:", signOutErr);
        }

        return redirectRes;
      }

      // If user tries to access /auth while logged in, send to home
      if (pathname.startsWith("/auth")) {
        const url = req.nextUrl.clone();
        url.pathname = "/";
        return NextResponse.redirect(url);
      }

      // Authorized user, continue
      return res;
    }

    // 5) No user -> Redirect to /auth for protected routes
    // Allow unauthenticated access to `/auth` (we returned early above), everything else -> /auth
    const url = req.nextUrl.clone();
    url.pathname = "/auth";
    // preserve where user wanted to go (optional)
    url.searchParams.set("redirect_to", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  } catch (err) {
    // Catch-all: don't crash middleware — redirect to /auth so developer can inspect logs
    console.error("Middleware unexpected error:", err);
    const url = req.nextUrl.clone();
    url.pathname = "/auth";
    return NextResponse.redirect(url);
  }
}

/**
 * Exclude auth/callback explicitly from the matcher so Next's matcher doesn't route it through middleware.
 * Also exclude next/static and next/image routes.
 */
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|auth/callback).*)"],
};
