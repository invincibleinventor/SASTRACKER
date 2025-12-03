import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";



const STATIC_AND_ICON_REGEX = /\.(svg|png|jpg|jpeg|gif|webp|css|js|woff2?|ttf)$/;

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname === "/favicon.ico" ||
    STATIC_AND_ICON_REGEX.test(pathname)
  ) {
    return NextResponse.next();
  }

  if (pathname === "/auth/callback" || pathname.startsWith("/auth")) {
    return NextResponse.next();
  }

  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  try {
    const {
      data: { session },
      error: sessionErr,
    } = await supabase.auth.getSession();

    if (sessionErr) {
      console.error("Supabase getSession error in middleware:", sessionErr);
      const url = req.nextUrl.clone();
      url.pathname = "/auth";
      return NextResponse.redirect(url);
    }

    const user = session?.user ?? null;

    if (user) {
      const allowedDomains = ["sastra.ac.in", "sastra.edu"];
      const email = (user.email ?? "").toLowerCase().trim();
      const isAllowed = allowedDomains.some((d) => email.endsWith(d));

      if (!isAllowed) {
        const redirectUrl = req.nextUrl.clone();
        redirectUrl.pathname = "/auth";
        redirectUrl.searchParams.set("invalid_domain", "1");

        const redirectRes = NextResponse.redirect(redirectUrl);

        const supabaseSignOut = createMiddlewareClient({ req, res: redirectRes });
        try {
          await supabaseSignOut.auth.signOut();
        } catch (signOutErr) {
          console.error("Error signing out in middleware:", signOutErr);
        }

        return redirectRes;
      }

      if (pathname.startsWith("/auth")) {
        const url = req.nextUrl.clone();
        url.pathname = "/";
        return NextResponse.redirect(url);
      }

      return res;
    }

    const url = req.nextUrl.clone();
    url.pathname = "/auth";
    url.searchParams.set("redirect_to", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  } catch (err) {
    console.error("Middleware unexpected error:", err);
    const url = req.nextUrl.clone();
    url.pathname = "/auth";
    return NextResponse.redirect(url);
  }
}
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|auth/callback).*)"],
};
