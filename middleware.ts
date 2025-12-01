import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const path = req.nextUrl.pathname

  // 1. BYPASS MIDDLEWARE FOR AUTH CALLBACK
  // This allows the route handler to exchange the code for a session without interference
  if (path === '/auth/callback') {
    return res
  }

  const supabase = createMiddlewareClient({ req, res })

  // Refresh session if possible
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 2. Unauthenticated Users
  if (!user) {
    // Allow access to login page
    if (path.startsWith('/auth')) {
      return res
    }
    
    // Redirect ANY other route to /auth
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = '/auth'
    return NextResponse.redirect(redirectUrl)
  }

  // 3. Authenticated Users
  if (user) {
    // Prevent logged-in users from accessing the login page
    if (path === '/auth') {
      const redirectUrl = req.nextUrl.clone()
      redirectUrl.pathname = '/'
      return NextResponse.redirect(redirectUrl)
    }

    // Domain Enforcement
    if (user.email) {
      const allowedDomains = [
        'sastra.ac.in',
        'it.sastra.edu',
        'ict.sastra.edu',
        'soc.sastra.edu',
        'cse.sastra.edu'
      ];

      const email = user.email.toLowerCase();
      const isAllowed = allowedDomains.some(domain => email.endsWith(`@${domain}`));

      if (!isAllowed) {
        // Sign out and redirect
        const redirectUrl = req.nextUrl.clone()
        redirectUrl.pathname = '/auth'
        redirectUrl.searchParams.set('error', 'Unauthorized Domain. Please use a SASTRA email.')
        
        const response = NextResponse.redirect(redirectUrl)
        const supabaseSignOut = createMiddlewareClient({ req, res: response })
        await supabaseSignOut.auth.signOut()
        
        return response
      }
    }
  }

  return res
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}