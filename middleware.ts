import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const user = session?.user;
  const pathname = req.nextUrl.pathname;

  // 1. IGNORE STATIC ASSETS (Always Allow)
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname === "/favicon.ico" ||
    pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|css|js|woff2?|ttf)$/)
  ) {
    return res;
  }

  // 2. AUTHENTICATED USER CHECKS
  if (user) {
    // A. Domain Enforcement
    const allowedDomains = ["sastra.ac.in", "sastra.edu"];
    const email = (user.email ?? "").toLowerCase().trim();
    // Check if email ends with any allowed domain (handling subdomains automatically)
    const isAllowed = allowedDomains.some((d) => email.endsWith(d));

    if (!isAllowed) {
      // Force Sign Out
      await supabase.auth.signOut();
      
      // Redirect to Auth with Error
      const url = req.nextUrl.clone();
      url.pathname = "/auth";
      url.searchParams.set("invalid_domain", "1");
      return NextResponse.redirect(url);
    }

    // B. Prevent Access to Login Page if already logged in
    if (pathname === "/auth") {
      const url = req.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  // 3. UNAUTHENTICATED USER CHECKS
  if (!user) {
    // Allow access to Auth pages
    if (pathname.startsWith("/auth")) {
      return res;
    }

    // Redirect protected routes to Auth
    const url = req.nextUrl.clone();
    url.pathname = "/auth";
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};