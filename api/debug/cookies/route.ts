import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const rawCookieHeader = req.headers.get("cookie") ?? "";
    console.log("[DEBUG] incoming cookie header:", rawCookieHeader);
    return NextResponse.json({ ok: true, cookieHeader: rawCookieHeader.split("; ").filter(Boolean) });
  } catch (err) {
    console.error("[DEBUG] cookie debug error:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
