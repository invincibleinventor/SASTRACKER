import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

const STATIC_REGEX = /\.(svg|png|jpg|jpeg|gif|webp|css|js|woff2?|ttf|ico)$/;
const SASTRA_DOMAINS = ["sastra.ac.in", "sastra.edu"];

function isSastraEmail(email: string): boolean {
  const lower = email.toLowerCase().trim();
  return SASTRA_DOMAINS.some((d) => lower.endsWith(d));
}

const RESUME_AUTH_ROUTES = ["/resumes/submit", "/resumes/fork", "/resumes/diff"];
const ADMIN_ROUTES = ["/admin"];
const PYQ_ROUTES = ["/upload", "/dashboard", "/question"];

function matchesRoute(pathname: string, routes: string[]): boolean {
  return routes.some(r => pathname === r || pathname.startsWith(r + "/"));
}

function isPublicResumeRoute(pathname: string): boolean {
  if (pathname === "/resumes") return true;
  if (pathname.startsWith("/resumes/") && !matchesRoute(pathname, RESUME_AUTH_ROUTES)) {
    return true;
  }
  return false;
}

function isPublicProjectRoute(pathname: string): boolean {
  if (pathname === "/projects") return true;
  if (pathname.startsWith("/projects/") && pathname !== "/projects/submit") {
    return true;
  }
  return false;
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.startsWith("/api") ||
    STATIC_REGEX.test(pathname)
  ) {
    return NextResponse.next();
  }

  if (pathname === "/auth" || pathname === "/auth/callback") {
    return NextResponse.next();
  }

  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user ?? null;
    const email = user?.email?.toLowerCase().trim() ?? "";
    const isSastra = isSastraEmail(email);

    if (isPublicResumeRoute(pathname) || isPublicProjectRoute(pathname)) {
      return res;
    }

    if (pathname === "/") {
      return res;
    }

    if (matchesRoute(pathname, PYQ_ROUTES)) {
      if (!user) {
        const url = req.nextUrl.clone();
        url.pathname = "/auth";
        url.searchParams.set("redirect_to", pathname);
        return NextResponse.redirect(url);
      }
      if (!isSastra) {
        const url = req.nextUrl.clone();
        url.pathname = "/resumes";
        return NextResponse.redirect(url);
      }
      return res;
    }

    if (matchesRoute(pathname, ADMIN_ROUTES)) {
      if (!user) {
        const url = req.nextUrl.clone();
        url.pathname = "/auth";
        url.searchParams.set("redirect_to", pathname);
        url.searchParams.set("admin", "1");
        return NextResponse.redirect(url);
      }
      return res;
    }

    if (matchesRoute(pathname, RESUME_AUTH_ROUTES)) {
      if (!user) {
        const url = req.nextUrl.clone();
        url.pathname = "/auth";
        url.searchParams.set("redirect_to", pathname);
        url.searchParams.set("public", "1");
        return NextResponse.redirect(url);
      }
      return res;
    }

    if (pathname === "/projects/submit") {
      if (!user) {
        const url = req.nextUrl.clone();
        url.pathname = "/auth";
        url.searchParams.set("redirect_to", pathname);
        url.searchParams.set("public", "1");
        return NextResponse.redirect(url);
      }
      return res;
    }

    if (pathname === "/profile") {
      if (!user) {
        const url = req.nextUrl.clone();
        url.pathname = "/auth";
        url.searchParams.set("redirect_to", pathname);
        return NextResponse.redirect(url);
      }
      return res;
    }

    return res;
  } catch (err) {
    return res;
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
