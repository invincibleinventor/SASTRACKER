import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  const { data: { user } } = await supabase.auth.getUser()

  const pathname = req.nextUrl.pathname

  const allowedDomains = [
    "@sastra.ac.in",
    "@it.sastra.edu",
    "@cse.sastra.edu",
    "@soc.sastra.edu",
  ]

  const isAuthPage = pathname.startsWith("/auth")

  // 🔥 1. If user NOT logged in → only /auth is allowed
  if (!user) {
    if (!isAuthPage) {
      const url = req.nextUrl.clone()
      url.pathname = "/auth"
      return NextResponse.redirect(url)
    }
    return res
  }

  // 🔥 2. If logged in but email not valid → logout + redirect to /auth
  const email = user.email?.toLowerCase() || ""

  const isValidEmail = allowedDomains.some(domain =>
    email.endsWith(domain)
  )

  if (!isValidEmail) {
    // Force logout
    await supabase.auth.signOut()

    const url = req.nextUrl.clone()
    url.pathname = "/auth"
    return NextResponse.redirect(url)
  }

  // User authenticated + email valid → allow request
  return res
}

export const config = {
  matcher: [
    // Protect everything except static assets
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
