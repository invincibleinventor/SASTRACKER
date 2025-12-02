// app/auth/callback/route.ts
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");

    console.log("[auth/callback] invoked, code present:", !!code);

    if (!code) {
      console.error("[auth/callback] no code in callback URL");
      return NextResponse.redirect(new URL("/auth", request.url));
    }

    // **Important**: await cookies() here to unwrap the Promise and get RequestCookies
    const nextCookies = await cookies();

    // Pass a synchronous function that returns the unwrapped RequestCookies.
    // We cast to `any` to avoid type mismatches between libs/next versions.
    const supabase = createRouteHandlerClient({
      cookies: (() => nextCookies) as any,
    });

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("[auth/callback] exchangeCodeForSession error:", error);
      return NextResponse.redirect(new URL("/auth?exchange_error=1", request.url));
    }

    console.log("[auth/callback] exchange succeeded", !!data.session);
    return NextResponse.redirect(new URL("/", request.url));
  } catch (err) {
    console.error("[auth/callback] unexpected error:", err);
    return NextResponse.redirect(new URL("/auth", request.url));
  }
}
